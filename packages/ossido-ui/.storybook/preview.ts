import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    // The default screens are full-viewport (fixed / min-height), so render
    // them without Storybook's padded canvas.
    layout: 'fullscreen',
  },
};

export default preview;
