import type { Meta, StoryObj } from '@storybook/react-vite'

import { DefaultScreen } from './DefaultScreen'

const meta = {
  title: 'Default Screens/DefaultScreen',
  component: DefaultScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultScreen>

export default meta
type Story = StoryObj<typeof meta>

/** The shell used by the 404 page (router supplies the real `<Link>`). */
export const NotFound: Story = {
  args: {
    badge: '404',
    title: 'Page not found',
    children: (
      <>
        <p className="ossido-screen-text">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <a className="ossido-screen-action" href="/">
          Return to homepage
        </a>
      </>
    ),
  },
}

/** Generic usage — any badge + title with custom content. */
export const Generic: Story = {
  args: {
    badge: 'Info',
    title: 'Nothing here yet',
    children: (
      <p className="ossido-screen-text">This screen is a blank canvas.</p>
    ),
  },
}
