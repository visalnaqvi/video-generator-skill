import React from 'react';
import { Composition } from 'remotion';
import { Brand, fallbackBrand } from './brand';
import { StyleTokens } from './style';
import { Branded } from './BrandContext';
import { templates } from './templates';
import { calculateVideoMetadata, Video, VideoProps } from './Video';

// Sample content so each template can be previewed alone in Remotion Studio.
const samples: Record<string, Record<string, unknown>> = {
  NumberSlam: { value: '87', label: 'CA Final Costing', caption: '1st attempt', tag: '— Eklavya, CA Final' },
  TextCard: { text: 'The paper students dread', emphasis: ['dread'], surface: 'secondary' },
  LogoReveal: { tagline: 'Greatness Achieved Through Excellence' },
  NameCards: { heading: 'Your mentors', people: [{ name: 'CA Sanjay Aggarwal', role: 'Costing · SCMPE' }, { name: 'CA Manoj Batra', role: 'Indirect Taxes' }] },
  StatCounter: { value: 25, suffix: '+', label: 'years teaching CA students' },
  ListCards: { items: ['Crystal-clear concepts', 'CA & CMA: Foundation → Final', 'Online or classroom'] },
  RatingStars: { rating: '5.0', label: 'on Google', count: '105 ratings' },
  EndCard: { headline: 'FREE Career Counselling', cta: 'Call 72100 32621', subline: 'Sanjay Aggarwal Classes' },
  PersonSpotlight: { photo: 'sample/person.jpg', name: 'Alex Morgan', role: 'Founder' },
  Testimonial: { quote: 'Clear, practical and genuinely helpful.', name: 'Sam Lee', detail: 'Customer', stars: 5 },
  OfferCards: { heading: 'What we offer', items: [{ title: 'Service one' }, { title: 'Service two' }, { title: 'Service three' }, { title: 'Service four' }] },
  PhotoScene: { image: 'sample/photo.jpg', caption: 'A caption over the photo' },
};

const withBrand = (name: string) => {
  const T = templates[name];
  const Preview: React.FC<{ brand?: Brand; style?: Partial<StyleTokens> } & Record<string, unknown>> = ({ brand, style, ...props }) => (
    <Branded brand={brand} style={style}><T {...props} /></Branded>
  );
  return Preview;
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      calculateMetadata={calculateVideoMetadata}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        brand: fallbackBrand,
        format: '9:16',
        scenes: Object.keys(samples).map((t) => ({ template: t, durationInFrames: 75, props: samples[t], transition: { type: 'fade' } })),
      } satisfies VideoProps}
    />
    {Object.keys(templates).map((name) => (
      <Composition key={name} id={name} component={withBrand(name)} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={{ brand: fallbackBrand, ...samples[name] }} />
    ))}
  </>
);
