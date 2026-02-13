const initMotionMode = () => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('shot')) document.body.classList.add('is-shot')
}

const initMobileNav = () => {
    const toggle = document.querySelector('.nav-toggle')
    const nav = document.querySelector('#primary-nav')
    const overlay = document.querySelector('.nav-overlay')
    if (!toggle || !nav || !overlay) return
    const compactBreakpoint = 1024

    const openNav = () => {
        nav.classList.add('nav--open')
        nav.setAttribute('aria-hidden', 'false')
        toggle.classList.add('nav-toggle--open')
        toggle.setAttribute('aria-expanded', 'true')
        document.body.classList.add('nav-open')
    }

    const closeNav = () => {
        nav.classList.remove('nav--open')
        nav.setAttribute('aria-hidden', 'true')
        toggle.classList.remove('nav-toggle--open')
        toggle.setAttribute('aria-expanded', 'false')
        document.body.classList.remove('nav-open')
    }

    const updateNavCompact = () => {
        const ua = navigator.userAgent || ''
        const uaData = navigator.userAgentData
        const isMobileUA = uaData?.mobile || /Android|iPhone|iPod/i.test(ua)
        const isTabletUA =
            /iPad|Tablet|Silk|Kindle|PlayBook/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        const isSmallViewport = window.matchMedia(`(max-width: ${compactBreakpoint}px)`).matches
        const isCompact = isMobileUA || isTabletUA || isSmallViewport

        document.body.classList.toggle('nav-compact', isCompact)
        if (!isCompact) closeNav()
    }

    nav.setAttribute('aria-hidden', 'true')
    updateNavCompact()

    toggle.addEventListener('click', () => {
        if (nav.classList.contains('nav--open')) {
            closeNav()
            return
        }
        openNav()
    })

    overlay.addEventListener('click', closeNav)

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeNav()
    })

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (document.body.classList.contains('nav-compact')) closeNav()
        })
    })

    window.addEventListener('resize', updateNavCompact)
}

const initMapConnectors = () => {
    const mapRoot = document.querySelector('.map-viz__inner')
    if (!mapRoot) return

    const anchorClasses = ['anchor-tl', 'anchor-tr', 'anchor-bl', 'anchor-br']
    const edgeInset = 1
    const cornerPortOffset = 4
    const connectorClearance = 0.4

    const readCornerPoint = (rect, corner, rootRect) => {
        const xLeft = rect.left - rootRect.left + edgeInset
        const xRight = rect.right - rootRect.left - edgeInset
        const yTop = rect.top - rootRect.top + edgeInset
        const yBottom = rect.bottom - rootRect.top - edgeInset

        switch (corner) {
            case 'tr':
                return { x: xRight + cornerPortOffset, y: yTop - cornerPortOffset }
            case 'bl':
                return { x: xLeft - cornerPortOffset, y: yBottom + cornerPortOffset }
            case 'br':
                return { x: xRight + cornerPortOffset, y: yBottom + cornerPortOffset }
            default:
                return { x: xLeft - cornerPortOffset, y: yTop - cornerPortOffset }
        }
    }

    const resolveNearestCorner = (source, corners) => {
        let nearest = 'tl'
        let minDistance = Number.POSITIVE_INFINITY
        for (const [corner, point] of Object.entries(corners)) {
            const dx = point.x - source.x
            const dy = point.y - source.y
            const distance = Math.hypot(dx, dy)
            if (distance < minDistance) {
                minDistance = distance
                nearest = corner
            }
        }
        return nearest
    }

    const syncConnectors = () => {
        const rootRect = mapRoot.getBoundingClientRect()
        const pointers = mapRoot.querySelectorAll('.map-viz__pointer[data-from][data-to]')

        pointers.forEach(pointer => {
            const fromClass = pointer.dataset.from
            const toClass = pointer.dataset.to
            const cornerPreference = (pointer.dataset.corner || 'auto').toLowerCase()

            const fromPoint = mapRoot.querySelector(`.map-viz__location.${fromClass} .map-viz__point`)
            const browser = mapRoot.querySelector(`.map-viz__browser.${toClass}`)
            if (!fromPoint || !browser) return

            browser.classList.remove(...anchorClasses)

            if (window.getComputedStyle(browser).display === 'none') {
                pointer.style.display = 'none'
                return
            }
            pointer.style.display = ''

            const sourceRect = fromPoint.getBoundingClientRect()
            const browserRect = browser.getBoundingClientRect()
            const source = {
                x: sourceRect.left + sourceRect.width / 2 - rootRect.left,
                y: sourceRect.top + sourceRect.height / 2 - rootRect.top
            }

            const cornerPoints = {
                tl: readCornerPoint(browserRect, 'tl', rootRect),
                tr: readCornerPoint(browserRect, 'tr', rootRect),
                bl: readCornerPoint(browserRect, 'bl', rootRect),
                br: readCornerPoint(browserRect, 'br', rootRect)
            }

            const corner =
                cornerPreference === 'auto'
                    ? resolveNearestCorner(source, cornerPoints)
                    : cornerPoints[cornerPreference]
                      ? cornerPreference
                      : 'tl'

            const target = cornerPoints[corner]
            const dx = target.x - source.x
            const dy = target.y - source.y
            const rawLength = Math.hypot(dx, dy)
            const length = Math.max(16, rawLength - connectorClearance)
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI

            pointer.style.left = `${source.x}px`
            pointer.style.top = `${source.y}px`
            pointer.style.setProperty('--beam-len', `${length}px`)
            pointer.style.setProperty('--beam-angle', `${angle}deg`)

            browser.classList.add(`anchor-${corner}`)
        })
    }

    let rafLoopId = 0
    let resizeRafId = 0
    let lastLoopTs = 0

    const loopSync = ts => {
        if (!lastLoopTs || ts - lastLoopTs >= 33) {
            lastLoopTs = ts
            syncConnectors()
        }
        rafLoopId = window.requestAnimationFrame(loopSync)
    }

    const startLoop = () => {
        if (rafLoopId) return
        rafLoopId = window.requestAnimationFrame(loopSync)
    }

    const stopLoop = () => {
        if (!rafLoopId) return
        window.cancelAnimationFrame(rafLoopId)
        rafLoopId = 0
    }

    const scheduleSync = () => {
        if (resizeRafId) return
        resizeRafId = window.requestAnimationFrame(() => {
            resizeRafId = 0
            syncConnectors()
        })
    }

    syncConnectors()
    startLoop()
    window.addEventListener('load', scheduleSync)
    window.addEventListener('resize', scheduleSync, { passive: true })
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopLoop()
            return
        }
        syncConnectors()
        startLoop()
    })

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(scheduleSync)
        resizeObserver.observe(mapRoot)
    }
}

const initPageDiagnostics = () => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('check')) return
    const doc = document.documentElement
    const hero = document.querySelector('#hero')
    const heroBox = hero?.getBoundingClientRect?.()
    const vw = doc.clientWidth
    const sw = doc.scrollWidth
    doc.dataset.vw = String(vw)
    doc.dataset.sw = String(sw)
    doc.dataset.overflow = String(sw - vw)
    if (!heroBox) return
    const deltaX = heroBox.left + heroBox.width / 2 - vw / 2
    doc.dataset.heroDeltaX = String(Math.round(deltaX * 100) / 100)
}

const initEarlyAccessForm = () => {
    const form = document.querySelector('[data-form]')
    const status = document.querySelector('[data-form-status]')
    if (!form || !status) return

    const setStatus = (message, type) => {
        status.textContent = message
        status.dataset.status = type || ''
    }

    form.addEventListener('submit', async event => {
        event.preventDefault()
        setStatus('Sending...', 'pending')

        try {
            const response = await fetch(form.action, {
                method: form.method || 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            })

            if (!response.ok) {
                setStatus('Submission failed. Please try again later.', 'error')
                return
            }

            form.reset()
            setStatus('Request received. We will reach out when early access opens.', 'success')
        } catch {
            setStatus('Network error. Please try again later.', 'error')
        }
    })
}

initMotionMode()
initMobileNav()
initMapConnectors()
initPageDiagnostics()
initEarlyAccessForm()
