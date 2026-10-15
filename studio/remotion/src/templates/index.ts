import React from 'react';
import { NumberSlam } from './NumberSlam';
import { TextCard } from './TextCard';
import { LogoReveal } from './LogoReveal';
import { NameCards } from './NameCards';
import { StatCounter } from './StatCounter';
import { ListCards } from './ListCards';
import { RatingStars } from './RatingStars';
import { EndCard } from './EndCard';
import { PersonSpotlight } from './PersonSpotlight';
import { Testimonial } from './Testimonial';
import { OfferCards } from './OfferCards';
import { PhotoScene } from './PhotoScene';
import { Composed } from '../compose/Composed';

// Template name used in storyboard.json → component. Document every entry in studio/remotion/TEMPLATES.md.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const templates: Record<string, React.FC<any>> = {
  NumberSlam,
  TextCard,
  LogoReveal,
  NameCards,
  StatCounter,
  ListCards,
  RatingStars,
  EndCard,
  PersonSpotlight,
  Testimonial,
  OfferCards,
  PhotoScene,
  Composed,
};
