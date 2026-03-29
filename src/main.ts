import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Hero Entrance Timeline
  const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.2 } })

  // Fade in nav and video overlay smoothly
  tl.from('.navbar', { y: -50, opacity: 0, duration: 1 }, 0.5)
    .from('.hero-overlay', { opacity: 1, duration: 1.5 }, 0) // Starts solid, fades to gradient
    .from('.hero-video', { scale: 1.05, duration: 2, ease: 'power2.out' }, 0)

  // Stagger hero text
  tl.from('.hero-label .split-char', { opacity: 0, x: -20, duration: 0.8 }, 0.8)
    .to('.hero-title .split-line span', { y: '0%', stagger: 0.1 }, 0.8)
    .to('.hero-body .split-line span', { y: '0%', stagger: 0.1 }, 1.0)
    .to('.hero-actions.split-line span', { y: '0%', duration: 1 }, 1.3)

  
  // Services Section Entrance
  const servicesTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.services-section',
      start: 'top 70%',
    }
  })

  servicesTl.from('.services-label', { opacity: 0, y: 20, duration: 0.6 })
    .from('.services-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.4')
    .from('.nav-arrow', { opacity: 0, scale: 0.8, stagger: 0.1, duration: 0.4 }, '-=0.6')
    .from('.service-card', { 
      opacity: 0, 
      y: 60, 
      stagger: 0.15, 
      duration: 0.8, 
      ease: 'power3.out' 
    }, '-=0.4')

  // Carousel Buttons Logic
  const track = document.getElementById('servicesTrack')
  const prevBtn = document.getElementById('prevServices')
  const nextBtn = document.getElementById('nextServices')

  if (track && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      const card = track.querySelector('.service-card') as HTMLElement
      const scrollAmount = card ? card.offsetWidth + 48 : 480
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    })

    nextBtn.addEventListener('click', () => {
      const card = track.querySelector('.service-card') as HTMLElement
      const scrollAmount = card ? card.offsetWidth + 48 : 480
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    })
  }

  // Navbar solid background on scroll
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top+=100 top',
    end: 'max',
    toggleClass: { className: 'scrolled', targets: '.navbar' }
  })

  // Heatmap Section Entrance
  const heatmapTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.heatmap-section',
      start: 'top 70%',
    }
  })

  heatmapTl.from('.heatmap-label', { opacity: 0, y: 20, duration: 0.6 })
    .from('.heatmap-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.4')
    .from('.view-toggle', { opacity: 0, scale: 0.9, duration: 0.5 }, '-=0.6')
    .from('.heatmap-canvas', { opacity: 0, y: 40, duration: 0.8 }, '-=0.4')
    .from('.active-view .hotspot-pin', { opacity: 0, scale: 0, stagger: 0.15, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.2')

  // Heatmap Logic
  const toggleBtns = document.querySelectorAll('.toggle-btn')
  const views = document.querySelectorAll('.heatmap-view')
  const popover = document.getElementById('hotspot-popover')
  const popoverTitle = document.getElementById('popover-title')
  const popoverDesc = document.getElementById('popover-desc')
  const closePopoverBtn = document.getElementById('close-popover')

  // Switch views
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement
      const viewId = target.getAttribute('data-view')
      
      // Update buttons
      toggleBtns.forEach(b => b.classList.remove('active'))
      target.classList.add('active')
      
      // Update views
      views.forEach(v => {
        v.classList.remove('active-view')
        if (v.id === `${viewId}-view`) {
          v.classList.add('active-view')
          // Re-animate pins
          gsap.fromTo(v.querySelectorAll('.hotspot-pin'), 
            { opacity: 0, scale: 0 }, 
            { opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.2 }
          )
        }
      })
      
      // Close popover on switch
      if (popover) popover.classList.remove('visible')
    })
  })

  // Open Popover
  let popoverTimeout: ReturnType<typeof setTimeout> | null = null;
  const allPins = document.querySelectorAll('.hotspot-pin')
  allPins.forEach(pin => {
    pin.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement
      const title = target.getAttribute('data-title') || 'OEM Part'
      const desc = target.getAttribute('data-desc') || 'Part description.'
      
      if (popover && popoverTitle && popoverDesc) {
        if (popoverTimeout) clearTimeout(popoverTimeout);

        const showPopover = () => {
          popoverTitle.textContent = title
          popoverDesc.textContent = desc
          
          const canvas = target.closest('.heatmap-canvas') as HTMLElement
          if (canvas) {
            const pinRect = target.getBoundingClientRect()
            const canvasRect = canvas.getBoundingClientRect()
            
            const x = pinRect.left - canvasRect.left + (pinRect.width / 2)
            const y = pinRect.top - canvasRect.top
            
            popover.classList.remove('flip-left')
            if (x + 360 > canvasRect.width) {
               popover.classList.add('flip-left')
            }
            popover.style.left = `${x}px`
            popover.style.top = `${y}px`
          }

          popover.classList.add('visible')
        }

        if (popover.classList.contains('visible')) {
          popover.classList.remove('visible')
          popoverTimeout = setTimeout(showPopover, 250) // wait for exit animation
        } else {
          showPopover()
        }
      }
    })
  })

  // Close Popover
  if (closePopoverBtn && popover) {
    closePopoverBtn.addEventListener('click', () => {
      popover.classList.remove('visible')
    })
  }

  // Also close popover if clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (popover && popover.classList.contains('visible') && 
        !target.closest('.hotspot-pin') && 
        !target.closest('.hotspot-popover')) {
      popover.classList.remove('visible')
    }
  })

  // Development Tool: Click Image to get exact coordinates
  const devImages = document.querySelectorAll('.heatmap-image')
  devImages.forEach(img => {
    img.addEventListener('click', (e: Event) => {
      const mouseEvent = e as MouseEvent
      const target = mouseEvent.target as HTMLElement
      const rect = target.getBoundingClientRect()
      const x = ((mouseEvent.clientX - rect.left) / rect.width * 100).toFixed(1)
      const y = ((mouseEvent.clientY - rect.top) / rect.height * 100).toFixed(1)
      console.log(`[Heatmap Calibration] Set your HTML to: style="top: ${y}%; left: ${x}%;"`)
    })
  })
