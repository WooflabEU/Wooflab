import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function createSceneMotion(scenes) {
  const media = gsap.matchMedia();
  media.add({
    desktop: '(min-width: 761px)',
    mobile: '(max-width: 760px)',
    reduce: '(prefers-reduced-motion: reduce)',
  }, context => {
    if (context.conditions.reduce) return;
    const distance = context.conditions.mobile ? 14 : 30;
    scenes.forEach((scene, index) => {
      const artwork = scene.querySelector('.scene-media');
      const copy = scene.querySelector('.scene-copy');
      if (index > 0 && copy) {
        gsap.fromTo(copy, { y: distance, opacity: .25 }, {
          y: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: scene, start: 'top 85%', end: 'top 22%', scrub: true, invalidateOnRefresh: true },
        });
      }
      if (artwork) {
        gsap.fromTo(artwork, { y: index === 0 ? 0 : distance, scale: .97 }, {
          y: -distance / 2, scale: 1.025, ease: 'none',
          scrollTrigger: { trigger: scene, start: index === 0 ? 'top top' : 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        });
      }
    });
  });
  return () => media.revert();
}
