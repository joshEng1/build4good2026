import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
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

  
  // Custom Scroll Marquee Effect
  gsap.to('.text-marquee', {
    xPercent: -50,
    ease: 'none',
    scrollTrigger: {
      trigger: '.next-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  })

  // Stats counting numbers
  const statNumbers = document.querySelectorAll('.stat-number')
  
  statNumbers.forEach((stat) => {
    const target = parseInt(stat.getAttribute('data-target') || '0', 10)
    
    gsap.to(stat, {
      innerHTML: target,
      duration: 2,
      snap: { innerHTML: 1 },
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.stats-row',
        start: 'top 80%',
        once: true
      }
    })
  })

  // Pin section example
  ScrollTrigger.create({
    trigger: '.pin-section',
    start: 'top top',
    end: '+=1000',
    pin: true,
    animation: gsap.to('.stats-row', { opacity: 1, y: 0 }),
    scrub: true
  })
})
