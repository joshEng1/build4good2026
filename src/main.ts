import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  productCategories,
  productCatalog,
  productInventoryTotal,
  productMakes,
  productModelsByMake,
  type ProductRecord,
} from './productCatalog'

gsap.registerPlugin(ScrollTrigger)

const q = <T extends Element>(selector: string) => document.querySelector<T>(selector)
const qa = <T extends Element>(selector: string) => Array.from(document.querySelectorAll<T>(selector))

const animateGroup = (triggerSelector: string, itemSelector: string, vars: gsap.TweenVars = {}) => {
  const trigger = q<HTMLElement>(triggerSelector)
  const items = qa<HTMLElement>(itemSelector)

  if (!trigger || !items.length) return

  gsap.from(items, {
    opacity: 0,
    y: 48,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger,
      start: 'top 75%',
    },
    ...vars,
  })
}

const bindHorizontalScroller = ({
  trackSelector,
  prevSelector,
  nextSelector,
  progressSelector,
  itemSelector,
  gap = 48,
}: {
  trackSelector: string
  prevSelector: string
  nextSelector: string
  progressSelector?: string
  itemSelector: string
  gap?: number
}) => {
  const track = q<HTMLElement>(trackSelector)
  const prevBtn = q<HTMLButtonElement>(prevSelector)
  const nextBtn = q<HTMLButtonElement>(nextSelector)
  const progressFill = progressSelector ? q<HTMLElement>(progressSelector) : null

  if (!track || !prevBtn || !nextBtn) return

  const updateScrollerState = () => {
    const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0)
    const progress = maxScroll > 0 ? (track.scrollLeft / maxScroll) * 100 : 100

    if (progressFill) {
      progressFill.style.width = `${progress}%`
    }

    prevBtn.disabled = track.scrollLeft <= 4
    nextBtn.disabled = track.scrollLeft >= maxScroll - 4
  }

  const getScrollAmount = () => {
    const firstItem = track.querySelector<HTMLElement>(itemSelector)
    return firstItem ? firstItem.getBoundingClientRect().width + gap : track.clientWidth
  }

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' })
  })

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' })
  })

  track.addEventListener('scroll', updateScrollerState, { passive: true })
  window.addEventListener('resize', updateScrollerState)
  updateScrollerState()
}

type ProductsCustomSelectControl = {
  close: (restoreFocus?: boolean) => void
  refresh: () => void
  syncFromSelect: () => void
}

let activeProductsSelectCloser: ((restoreFocus?: boolean) => void) | null = null

// Mirror native product filters with a custom menu so the open state can match the site styling.
const createProductsCustomSelect = (select: HTMLSelectElement): ProductsCustomSelectControl => {
  const field = select.closest<HTMLElement>('.products-field')

  if (!field) {
    return {
      close: () => { },
      refresh: () => { },
      syncFromSelect: () => { },
    }
  }

  const fieldLabel = field.querySelector(':scope > span')?.textContent?.trim() || 'Filter'
  const triggerId = `${select.id}-trigger`
  const menuId = `${select.id}-menu`
  const customSelect = document.createElement('div')
  const trigger = document.createElement('button')
  const triggerValue = document.createElement('span')
  const triggerIcon = document.createElement('span')
  const menu = document.createElement('div')
  const optionList = document.createElement('div')
  let optionButtons: HTMLButtonElement[] = []

  field.classList.add('is-enhanced-select')
  customSelect.className = 'products-custom-select'

  trigger.type = 'button'
  trigger.id = triggerId
  trigger.className = 'products-custom-trigger'
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.setAttribute('aria-controls', menuId)
  trigger.setAttribute('aria-label', fieldLabel)

  triggerValue.className = 'products-custom-value'

  triggerIcon.className = 'products-custom-icon'
  triggerIcon.setAttribute('aria-hidden', 'true')

  trigger.append(triggerValue, triggerIcon)

  menu.className = 'products-custom-panel'
  menu.id = menuId
  menu.setAttribute('role', 'listbox')
  menu.setAttribute('aria-labelledby', triggerId)

  optionList.className = 'products-custom-options'
  menu.append(optionList)
  customSelect.append(trigger, menu)
  field.append(customSelect)

  const availableButtons = () => optionButtons.filter((optionButton) => !optionButton.disabled)

  const focusOptionAt = (position: number) => {
    const available = availableButtons()

    if (!available.length) return

    const nextPosition = Math.min(Math.max(position, 0), available.length - 1)
    available[nextPosition].focus()
  }

  const focusSelectedOption = () => {
    const available = availableButtons()

    if (!available.length) return

    const selectedPosition = available.findIndex((optionButton) => optionButton.dataset.value === select.value)
    focusOptionAt(selectedPosition >= 0 ? selectedPosition : 0)
  }

  const closeMenu = (restoreFocus = false) => {
    customSelect.classList.remove('is-open')
    trigger.setAttribute('aria-expanded', 'false')

    if (activeProductsSelectCloser === closeMenu) {
      activeProductsSelectCloser = null
    }

    if (restoreFocus) {
      trigger.focus()
    }
  }

  const openMenu = () => {
    if (select.disabled) return

    if (activeProductsSelectCloser && activeProductsSelectCloser !== closeMenu) {
      activeProductsSelectCloser()
    }

    customSelect.classList.add('is-open')
    trigger.setAttribute('aria-expanded', 'true')
    activeProductsSelectCloser = closeMenu

    requestAnimationFrame(() => {
      focusSelectedOption()
    })
  }

  const toggleMenu = () => {
    if (customSelect.classList.contains('is-open')) {
      closeMenu()
      return
    }

    openMenu()
  }

  const syncFromSelect = () => {
    const activeOption = select.selectedOptions[0] || select.options[0]

    triggerValue.textContent = activeOption?.text || fieldLabel
    field.classList.toggle('is-disabled', select.disabled)
    trigger.disabled = select.disabled

    optionButtons.forEach((optionButton) => {
      const isSelected = optionButton.dataset.value === select.value
      optionButton.classList.toggle('is-selected', isSelected)
      optionButton.setAttribute('aria-selected', String(isSelected))
    })

    if (select.disabled) {
      closeMenu()
    }
  }

  const refresh = () => {
    closeMenu()

    optionButtons = Array.from(select.options).map((option) => {
      const optionButton = document.createElement('button')

      optionButton.type = 'button'
      optionButton.className = 'products-custom-option'
      optionButton.dataset.value = option.value
      optionButton.textContent = option.text
      optionButton.disabled = option.disabled
      optionButton.setAttribute('role', 'option')
      optionButton.setAttribute('aria-selected', String(option.selected))

      optionButton.addEventListener('click', () => {
        if (optionButton.disabled) return

        const hasChanged = select.value !== option.value
        select.value = option.value
        syncFromSelect()
        closeMenu(true)

        if (hasChanged) {
          select.dispatchEvent(new Event('change', { bubbles: true }))
        }
      })

      optionButton.addEventListener('keydown', (event) => {
        const available = availableButtons()
        const currentPosition = available.indexOf(optionButton)

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          focusOptionAt(currentPosition + 1)
          return
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          focusOptionAt(currentPosition - 1)
          return
        }

        if (event.key === 'Home') {
          event.preventDefault()
          focusOptionAt(0)
          return
        }

        if (event.key === 'End') {
          event.preventDefault()
          focusOptionAt(available.length - 1)
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          closeMenu(true)
          return
        }

        if (event.key === 'Tab') {
          closeMenu()
        }
      })

      return optionButton
    })

    optionList.replaceChildren(...optionButtons)
    syncFromSelect()
  }

  trigger.addEventListener('click', toggleMenu)

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMenu()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleMenu()
      return
    }

    if (event.key === 'Escape' && customSelect.classList.contains('is-open')) {
      event.preventDefault()
      closeMenu()
    }
  })

  select.addEventListener('change', syncFromSelect)

  document.addEventListener('pointerdown', (event) => {
    const eventTarget = event.target

    if (!(eventTarget instanceof Node) || customSelect.contains(eventTarget)) return

    closeMenu()
  })

  window.addEventListener('resize', () => {
    closeMenu()
  })

  refresh()

  return {
    close: closeMenu,
    refresh,
    syncFromSelect,
  }
}

const initHeroIntro = () => {
  const hero = q<HTMLElement>('.hero')
  if (!hero) return

  const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.2 } })

  if (q('.navbar')) {
    tl.from('.navbar', { y: -50, opacity: 0, duration: 1 }, 0.5)
  }

  if (q('.hero-overlay')) {
    tl.from('.hero-overlay', { opacity: 1, duration: 1.5 }, 0)
  }

  if (q('.hero-video')) {
    tl.from('.hero-video', { scale: 1.05, duration: 2, ease: 'power2.out' }, 0)
  }

  if (q('.hero-label .split-char')) {
    tl.from('.hero-label .split-char', { opacity: 0, x: -20, duration: 0.8 }, 0.8)
  } else if (q('.hero-label')) {
    tl.from('.hero-label', { opacity: 0, x: -20, duration: 0.8 }, 0.8)
  }

  const titleLines = qa<HTMLElement>('.hero-title .split-line span')
  if (titleLines.length) {
    tl.to(titleLines, { y: '0%', stagger: 0.1 }, 0.8)
  } else if (q('.hero-title')) {
    tl.from('.hero-title', { opacity: 0, y: 40, duration: 1 }, 0.8)
  }

  const bodyLines = qa<HTMLElement>('.hero-body .split-line span')
  if (bodyLines.length) {
    tl.to(bodyLines, { y: '0%', stagger: 0.08 }, 1.0)
  } else if (q('.hero-body')) {
    tl.from('.hero-body', { opacity: 0, y: 28, duration: 0.9 }, 1.0)
  }

  const actionLines = qa<HTMLElement>('.hero-actions.split-line span')
  if (actionLines.length) {
    tl.to(actionLines, { y: '0%', duration: 1 }, 1.3)
  } else if (q('.hero-actions')) {
    tl.from('.hero-actions', { opacity: 0, y: 24, duration: 1 }, 1.3)
  }

  if (q('.about-hero-brand')) {
    tl.from('.about-hero-brand', { opacity: 0, x: 40, scale: 0.94, duration: 1 }, 1.05)
  }

  if (q('.navbar')) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'top+=100 top',
      end: 'max',
      toggleClass: { className: 'scrolled', targets: '.navbar' },
    })
  }
}

const initServices = () => {
  const section = q<HTMLElement>('.services-section')
  if (!section) return

  const servicesTl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 70%',
    },
  })

  servicesTl
    .from('.services-label', { opacity: 0, y: 20, duration: 0.6 })
    .from('.services-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.4')
    .from('.services-intro', { opacity: 0, y: 24, duration: 0.6 }, '-=0.5')
    .from('.services-section .nav-arrow', { opacity: 0, scale: 0.8, stagger: 0.1, duration: 0.4 }, '-=0.6')
    .from('.services-section .service-card', {
      opacity: 0,
      y: 60,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.4')

  const track = q<HTMLElement>('#servicesTrack')
  const prevBtn = q<HTMLButtonElement>('#prevServices')
  const nextBtn = q<HTMLButtonElement>('#nextServices')
  const servicesProgress = q<HTMLElement>('#servicesProgress')
  const servicesLabel = q<HTMLElement>('.services-label')

  if (servicesLabel) {
    servicesLabel.textContent = ''
    servicesLabel.setAttribute('aria-label', 'Explore')
  }

  if (prevBtn && nextBtn) {
    prevBtn.textContent = '\u2190'
    nextBtn.textContent = '\u2192'
  }

  if (track && prevBtn && nextBtn && servicesProgress) {
    bindHorizontalScroller({
      trackSelector: '#servicesTrack',
      prevSelector: '#prevServices',
      nextSelector: '#nextServices',
      progressSelector: '#servicesProgress',
      itemSelector: '.service-card',
      gap: 48,
    })
  }
}

const initHeatmap = () => {
  const section = q<HTMLElement>('.heatmap-section')
  if (!section) return

  const heatmapTl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 70%',
    },
  })

  heatmapTl
    .from('.heatmap-label', { opacity: 0, y: 20, duration: 0.6 })
    .from('.heatmap-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.4')
    .from('.view-toggle', { opacity: 0, scale: 0.9, duration: 0.5 }, '-=0.6')
    .from('.heatmap-canvas', { opacity: 0, y: 40, duration: 0.8 }, '-=0.4')
    .from('.active-view .hotspot-pin', {
      opacity: 0,
      scale: 0,
      stagger: 0.15,
      duration: 0.6,
      ease: 'back.out(1.7)',
    }, '-=0.2')

  const toggleBtns = qa<HTMLButtonElement>('.toggle-btn')
  const views = qa<HTMLElement>('.heatmap-view')
  const popover = q<HTMLElement>('#hotspot-popover')
  const popoverTitle = q<HTMLElement>('#popover-title')
  const popoverDesc = q<HTMLElement>('#popover-desc')
  const closePopoverBtn = q<HTMLButtonElement>('#close-popover')
  const popoverImg = q<HTMLImageElement>('#popover-img')
  const popoverCta = q<HTMLAnchorElement>('#popover-cta')
  const allPins = qa<HTMLElement>('.hotspot-pin')
  const HOTSPOT_POPOVER_GAP = 35
  const HOTSPOT_POPOVER_PADDING = 16
  let popoverTimeout: ReturnType<typeof setTimeout> | null = null

  const clamp = (value: number, min: number, max: number) => {
    if (min > max) return min
    return Math.min(Math.max(value, min), max)
  }

  const getPositionWithinAncestor = (element: HTMLElement, ancestor: HTMLElement) => {
    let left = 0
    let top = 0
    let current: HTMLElement | null = element

    while (current && current !== ancestor) {
      left += current.offsetLeft
      top += current.offsetTop
      current = current.offsetParent as HTMLElement | null
    }

    return { left, top }
  }

  const buildHotspotProductsHref = (target: HTMLElement) => {
    const params = new URLSearchParams()
    const filterMake = target.getAttribute('data-filter-make')
    const filterModel = target.getAttribute('data-filter-model')
    const filterCategory = target.getAttribute('data-filter-category')
    const filterSearch = target.getAttribute('data-filter-search')
    const hotspot = target.getAttribute('data-hotspot')

    if (filterMake || filterModel || filterCategory || filterSearch || hotspot) {
      params.set('source', 'heatmap')
    }

    if (filterMake) params.set('make', filterMake)
    if (filterModel) params.set('model', filterModel)
    if (filterCategory) params.set('category', filterCategory)
    if (filterSearch) params.set('search', filterSearch)
    if (hotspot) params.set('hotspot', hotspot)

    const query = params.toString()
    return query ? `/products.html?${query}#productFilters` : '/products.html#productFilters'
  }

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement
      const viewId = target.getAttribute('data-view')
      if (!viewId) return

      toggleBtns.forEach((toggleBtn) => toggleBtn.classList.remove('active'))
      target.classList.add('active')

      views.forEach((view) => {
        view.classList.remove('active-view')

        if (view.id === `${viewId}-view`) {
          view.classList.add('active-view')
          gsap.fromTo(
            view.querySelectorAll('.hotspot-pin'),
            { opacity: 0, scale: 0 },
            { opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.2 }
          )
        }
      })

      if (popover) {
        popover.classList.remove('visible')
      }
    })
  })

  allPins.forEach((pin) => {
    pin.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement
      const title = target.getAttribute('data-title') || 'OEM Part'
      const desc = target.getAttribute('data-desc') || 'Part description.'
      const imgSrc = target.getAttribute('data-img') || ''

      if (!popover || !popoverTitle || !popoverDesc) return

      if (popoverTimeout) {
        clearTimeout(popoverTimeout)
      }

      const showPopover = () => {
        popoverTitle.textContent = title
        popoverDesc.textContent = desc

        if (popoverCta) {
          popoverCta.href = buildHotspotProductsHref(target)
        }

        if (popoverImg) {
          if (imgSrc) {
            popoverImg.src = imgSrc
            popoverImg.style.display = 'block'
          } else {
            popoverImg.style.display = 'none'
          }
        }

        const canvas = target.closest<HTMLElement>('.heatmap-canvas')
        if (canvas) {
          const pinPosition = getPositionWithinAncestor(target, canvas)
          const pinCenterX = pinPosition.left + (target.offsetWidth / 2)
          const pinCenterY = pinPosition.top + (target.offsetHeight / 2)
          const popoverWidth = popover.offsetWidth || 320
          const popoverHeight = popover.offsetHeight || 0
          const canvasWidth = canvas.clientWidth
          const canvasHeight = canvas.clientHeight
          const canFitOnRight =
            pinCenterX + HOTSPOT_POPOVER_GAP + popoverWidth <= canvasWidth - HOTSPOT_POPOVER_PADDING
          const canFitOnLeft =
            pinCenterX - HOTSPOT_POPOVER_GAP - popoverWidth >= HOTSPOT_POPOVER_PADDING

          const shouldFlipLeft =
            (!canFitOnRight && canFitOnLeft) ||
            (!canFitOnRight && !canFitOnLeft && pinCenterX > canvasWidth / 2)

          const preferredLeft = shouldFlipLeft
            ? pinCenterX - HOTSPOT_POPOVER_GAP - popoverWidth
            : pinCenterX + HOTSPOT_POPOVER_GAP

          const clampedLeft = clamp(
            preferredLeft,
            HOTSPOT_POPOVER_PADDING,
            canvasWidth - popoverWidth - HOTSPOT_POPOVER_PADDING
          )
          const clampedTop = clamp(
            pinCenterY,
            (popoverHeight / 2) + HOTSPOT_POPOVER_PADDING,
            canvasHeight - (popoverHeight / 2) - HOTSPOT_POPOVER_PADDING
          )

          popover.classList.toggle('flip-left', shouldFlipLeft)
          popover.style.left = `${clampedLeft}px`
          popover.style.top = `${clampedTop}px`
        }

        popover.classList.add('visible')
      }

      if (popover.classList.contains('visible')) {
        popover.classList.remove('visible')
        popoverTimeout = setTimeout(showPopover, 250)
      } else {
        showPopover()
      }
    })
  })

  if (closePopoverBtn && popover) {
    closePopoverBtn.addEventListener('click', () => {
      popover.classList.remove('visible')
    })
  }

  if (popover) {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (
        popover.classList.contains('visible') &&
        !target.closest('.hotspot-pin') &&
        !target.closest('.hotspot-popover')
      ) {
        popover.classList.remove('visible')
      }
    })
  }

  const devImages = qa<HTMLImageElement>('.heatmap-image')
  devImages.forEach((image) => {
    image.addEventListener('click', (event: Event) => {
      const mouseEvent = event as MouseEvent
      const target = mouseEvent.target as HTMLElement
      const rect = target.getBoundingClientRect()
      const x = (((mouseEvent.clientX - rect.left) / rect.width) * 100).toFixed(1)
      const y = (((mouseEvent.clientY - rect.top) / rect.height) * 100).toFixed(1)
      console.log(`[Heatmap Calibration] Set your HTML to: style="top: ${y}%; left: ${x}%;"`)
    })
  })
}

const initWelcomeSections = () => {
  animateGroup('.customer-builds-section', '.about-brand-header, .about-builds-carousel', { y: 56, stagger: 0.14 })
  animateGroup('.testimonials-section', '.testimonials-header, .testimonial-card', { y: 42, stagger: 0.12 })
  animateGroup('.process-preview-section', '.process-preview-header, .process-preview-card, .process-preview-link', { y: 48, stagger: 0.12 })

  bindHorizontalScroller({
    trackSelector: '#homeBuildsTrack',
    prevSelector: '#homeBuildsPrev',
    nextSelector: '#homeBuildsNext',
    progressSelector: '#homeBuildsProgress',
    itemSelector: '.about-gallery-card',
    gap: 24,
  })
}

const initAboutAnimations = () => {
  if (!q('.about-page')) return

  animateGroup('.about-differentiators-section', '.about-difference-card')
  animateGroup('.founder-section', '.founder-portrait-shell, .founder-content', { y: 56, stagger: 0.18 })
  animateGroup('.faq-section', '.faq-item', { y: 32, stagger: 0.08 })
  animateGroup('.about-connect-section', '.about-connect-copy, .about-connect-card', { y: 56, stagger: 0.16 })

  const processTimeline = q<HTMLElement>('#aboutProcessTimeline')
  const processSteps = qa<HTMLElement>('.about-step')

  if (processTimeline && processSteps.length) {
    const setActiveStep = (activeIndex: number) => {
      processSteps.forEach((step, index) => {
        step.classList.toggle('is-active', index === activeIndex)
        step.classList.toggle('is-passed', index < activeIndex)
      })
    }

    setActiveStep(0)

    processSteps.forEach((step, index) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top center+=80',
        end: 'bottom center',
        onEnter: () => setActiveStep(index),
        onEnterBack: () => setActiveStep(index),
      })
    })
  }
}

const initProductsPage = () => {
  if (!q('.products-page')) return

  const searchInput = q<HTMLInputElement>('#productSearchInput')
  const makeFilter = q<HTMLSelectElement>('#productMakeFilter')
  const modelFilter = q<HTMLSelectElement>('#productModelFilter')
  const categoryFilter = q<HTMLSelectElement>('#productCategoryFilter')
  const productsHero = q<HTMLElement>('.products-hero')
  const resetFilters = q<HTMLButtonElement>('#productsClearFilters')
  const emptyReset = q<HTMLButtonElement>('#emptyReset')
  const productGrid = q<HTMLElement>('#productGrid')
  const productsEmptyState = q<HTMLElement>('#productEmpty')
  const visibleCount = q<HTMLElement>('#productCount')
  const stockCount = q<HTMLElement>('#stockCount')
  const activeFilterCount = q<HTMLElement>('#activeFilterCount')
  const filterNotice = q<HTMLElement>('#productFilterNotice')
  const resultsCopy = q<HTMLElement>('#resultsCopy')
  const inventoryTotal = q<HTMLElement>('#inventoryTotal')
  const makeTotal = q<HTMLElement>('#makeTotal')
  const categoryTotal = q<HTMLElement>('#categoryTotal')

  if (
    !searchInput ||
    !makeFilter ||
    !modelFilter ||
    !categoryFilter ||
    !resetFilters ||
    !emptyReset ||
    !productGrid ||
    !productsEmptyState ||
    !visibleCount ||
    !stockCount ||
    !activeFilterCount ||
    !resultsCopy ||
    !inventoryTotal ||
    !makeTotal ||
    !categoryTotal
  ) {
    return
  }

  type ProductsFilterState = {
    search: string
    make: string
    model: string
    category: string
  }

  const createDefaultFilterState = (): ProductsFilterState => ({
    search: '',
    make: 'all',
    model: 'all',
    category: 'all',
  })

  const filterState = createDefaultFilterState()
  const queryParams = new URLSearchParams(window.location.search)
  const isHeatmapSource = queryParams.get('source') === 'heatmap'
  const requestedHotspot = (queryParams.get('hotspot') || '').trim()

  const normalise = (value: string) => value.toLowerCase().trim()
  const readFilterParam = (key: 'search' | 'make' | 'model' | 'category') => (queryParams.get(key) || '').trim()
  const makeFilterControl = createProductsCustomSelect(makeFilter)
  const modelFilterControl = createProductsCustomSelect(modelFilter)
  const categoryFilterControl = createProductsCustomSelect(categoryFilter)

  const refreshFilterControls = () => {
    makeFilterControl.refresh()
    modelFilterControl.refresh()
    categoryFilterControl.refresh()
  }

  const syncFilterControls = () => {
    makeFilterControl.syncFromSelect()
    modelFilterControl.syncFromSelect()
    categoryFilterControl.syncFromSelect()
  }

  const setFilterState = (nextState: ProductsFilterState) => {
    filterState.search = nextState.search
    filterState.make = nextState.make
    filterState.model = nextState.model
    filterState.category = nextState.category
  }

  const setFilterNotice = (message = '') => {
    if (!filterNotice) return
    filterNotice.hidden = message.length === 0
    filterNotice.textContent = message
  }

  const matchesSearch = (product: ProductRecord, query: string) => {
    if (!query) return true

    const haystack = [
      product.title,
      product.sku,
      product.make,
      product.model,
      product.category,
      product.years,
      product.description,
      ...product.tags,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  }

  const filteredProducts = (state: ProductsFilterState = filterState) =>
    productCatalog.filter((product) => {
      if (state.make !== 'all' && product.make !== state.make) {
        return false
      }

      if (state.model !== 'all' && product.model !== state.model) {
        return false
      }

      if (state.category !== 'all' && product.category !== state.category) {
        return false
      }

      return matchesSearch(product, normalise(state.search))
    })

  const renderModelOptions = () => {
    const availableModels = filterState.make === 'all'
      ? Array.from(new Set(productCatalog.map((product) => product.model))).sort()
      : productModelsByMake[filterState.make] || []

    modelFilter.innerHTML = ['<option value="all">All models</option>']
      .concat(availableModels.map((model) => `<option value="${model}">${model}</option>`))
      .join('')

    modelFilter.disabled = availableModels.length === 0

    if (!availableModels.includes(filterState.model)) {
      filterState.model = 'all'
    }

    modelFilterControl.refresh()
  }

  const renderOptions = () => {
    makeFilter.innerHTML = ['<option value="all">All makes</option>']
      .concat(productMakes.map((make) => `<option value="${make}">${make}</option>`))
      .join('')

    categoryFilter.innerHTML = ['<option value="all">All categories</option>']
      .concat(productCategories.map((category) => `<option value="${category}">${category}</option>`))
      .join('')

    renderModelOptions()
    makeFilterControl.refresh()
    categoryFilterControl.refresh()
  }

  const getStockSignal = (stock: number) => {
    if (stock <= 1) {
      return {
        badge: 'Last unit',
        summary: 'Only 1 left',
        tone: 'is-critical',
        detail: 'Priority restock',
        urgent: true,
      }
    }

    if (stock <= 2) {
      return {
        badge: `Only ${stock} left`,
        summary: `${stock} remaining`,
        tone: 'is-low',
        detail: 'Low stock',
        urgent: true,
      }
    }

    if (stock <= 4) {
      return {
        badge: 'Limited stock',
        summary: `${stock} in stock`,
        tone: 'is-limited',
        detail: 'Available now',
        urgent: false,
      }
    }

    return {
      badge: 'In stock',
      summary: `${stock} in stock`,
      tone: 'is-ready',
      detail: 'Ready to ship',
      urgent: false,
    }
  }

  const renderProductCard = (product: ProductRecord) => {
    const stockSignal = getStockSignal(product.stock)

    return `
    <article class="product-card ${stockSignal.tone}" data-make="${product.make}" data-model="${product.model}" data-category="${product.category}">
      <div class="product-card-media">
        <img src="${product.image}" alt="${product.title} for ${product.make} ${product.model}">
        <div class="product-card-badges">
          <span class="product-badge">${product.category}</span>
          ${stockSignal.urgent ? `<span class="product-badge product-badge-stock ${stockSignal.tone}">${stockSignal.badge}</span>` : ''}
        </div>
      </div>
      <div class="product-card-body">
        <div class="product-card-heading">
          <h3>${product.title}</h3>
          <p>${product.description}</p>
        </div>
        <div class="product-card-specs" aria-label="Product specifications">
          <div class="product-spec">
            <span>Vehicle</span>
            <strong>${product.make} ${product.model}</strong>
          </div>
          <div class="product-spec">
            <span>Years</span>
            <strong>${product.years}</strong>
          </div>
        </div>
        <div class="product-card-status-row">
          <span class="product-card-sku">SKU ${product.sku}</span>
          <span class="product-stock-inline ${stockSignal.tone}">
            <span class="product-stock-dot" aria-hidden="true"></span>
            ${stockSignal.detail}
          </span>
        </div>
        <div class="product-card-footer">
          <div class="product-card-fitment">
            <span class="product-fitment-label">Availability</span>
            <strong>${stockSignal.summary}</strong>
          </div>
          <a class="product-cta" href="mailto:matt81503@gmail.com?subject=${encodeURIComponent(`Fitment check for ${product.sku}`)}">Ask about this part</a>
        </div>
      </div>
    </article>
  `
  }

  const updateSummary = (products: ProductRecord[]) => {
    const lowStockValue = products.filter((product) => product.stock <= 2).length
    const activeSummary = [
      filterState.make !== 'all' ? `Make ${filterState.make}` : '',
      filterState.model !== 'all' ? `Model ${filterState.model}` : '',
      filterState.category !== 'all' ? `Category ${filterState.category}` : '',
      filterState.search ? `Search ${filterState.search}` : '',
    ].filter(Boolean)

    visibleCount.textContent = String(products.length)
    stockCount.textContent = String(lowStockValue)
    activeFilterCount.textContent = activeSummary.length ? activeSummary.join(' / ') : 'All'
    resultsCopy.innerHTML = `Showing <strong>${products.length}</strong> product${products.length === 1 ? '' : 's'}.`
  }

  const syncControls = () => {
    searchInput.value = filterState.search
    makeFilter.value = filterState.make
    categoryFilter.value = filterState.category
    renderModelOptions()
    modelFilter.value = filterState.model
    syncFilterControls()
  }

  const renderProducts = () => {
    const products = filteredProducts()
    productGrid.innerHTML = products.map(renderProductCard).join('')
    productsEmptyState.hidden = products.length > 0
    updateSummary(products)
  }

  const resetFilterState = () => {
    setFilterNotice()
    setFilterState(createDefaultFilterState())
    syncControls()
    renderProducts()
  }

  const hasSeededFilters = ['search', 'make', 'model', 'category'].some((key) => queryParams.has(key))

  const getSeededFilterState = (): ProductsFilterState => ({
    search: readFilterParam('search'),
    make: readFilterParam('make') || 'all',
    model: readFilterParam('model') || 'all',
    category: readFilterParam('category') || 'all',
  })

  const applySeededFilters = () => {
    if (!hasSeededFilters) return

    const requestedState = getSeededFilterState()

    if (!isHeatmapSource) {
      setFilterState(requestedState)
      return
    }

    const fallbackStates: ProductsFilterState[] = [
      requestedState,
      { ...requestedState, model: 'all' },
      { ...requestedState, model: 'all', make: 'all' },
    ]

    const matchingState = fallbackStates.find((candidateState) => filteredProducts(candidateState).length > 0)

    if (matchingState) {
      setFilterState(matchingState)

      if (matchingState !== requestedState) {
        const hotspotLabel = requestedHotspot || 'this heatmap selection'
        setFilterNotice(
          `No exact Ford F 150 catalog match is available for ${hotspotLabel}. Showing the closest available results instead.`,
        )
      }

      return
    }

    setFilterState(requestedState)
  }

  makeFilter.addEventListener('change', (event) => {
    setFilterNotice()
    filterState.make = (event.currentTarget as HTMLSelectElement).value

    if (filterState.make === 'all') {
      filterState.model = 'all'
    }

    renderModelOptions()
    filterState.model = modelFilter.value
    renderProducts()
  })

  modelFilter.addEventListener('change', (event) => {
    setFilterNotice()
    filterState.model = (event.currentTarget as HTMLSelectElement).value
    renderProducts()
  })

  categoryFilter.addEventListener('change', (event) => {
    setFilterNotice()
    filterState.category = (event.currentTarget as HTMLSelectElement).value
    renderProducts()
  })

  searchInput.addEventListener('input', (event) => {
    setFilterNotice()
    filterState.search = (event.currentTarget as HTMLInputElement).value
    renderProducts()
  })

  resetFilters.addEventListener('click', resetFilterState)
  emptyReset.addEventListener('click', resetFilterState)

  inventoryTotal.textContent = String(productInventoryTotal)
  makeTotal.textContent = String(productMakes.length)
  categoryTotal.textContent = String(productCategories.length)

  applySeededFilters()
  renderOptions()
  refreshFilterControls()
  syncControls()
  renderProducts()

  const introTl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 0.9 } })
  introTl
    .from('.products-kicker', { opacity: 0, x: -20 }, 0.3)
    .from('.products-title', { opacity: 0, y: 36 }, 0.45)
    .from('.products-body', { opacity: 0, y: 26 }, 0.6)
    .from('.products-hero-actions', { opacity: 0, y: 24 }, 0.78)
    .from('.products-fact-card', { opacity: 0, x: 30, stagger: 0.1 }, 0.7)

  if (productsHero && q('.navbar')) {
    ScrollTrigger.create({
      trigger: productsHero,
      start: 'top+=100 top',
      end: 'max',
      toggleClass: { className: 'scrolled', targets: '.navbar' },
    })
  }

  gsap.from('.products-card-shell, .product-card', {
    opacity: 0,
    y: 42,
    stagger: 0.06,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.products-section',
      start: 'top bottom',
    },
  })
}

initHeroIntro()
initServices()
initWelcomeSections()
initHeatmap()
initAboutAnimations()
initProductsPage()
