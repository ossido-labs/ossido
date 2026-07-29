import type { Meta, StoryObj } from '@storybook/react-vite'

import { DefaultError } from './DefaultError'

const meta = {
  title: 'Default Screens/DefaultError',
  component: DefaultError,
  parameters: { layout: 'fullscreen' },
  // `error` is required by the shared props type but unused by DefaultError
  // (it never renders error details).
  args: { reset: (): void => undefined, error: new Error('Example error') },
} satisfies Meta<typeof DefaultError>

export default meta
type Story = StoryObj<typeof meta>

/** Production error fallback (no message/stack/source leaked). */
export const Default: Story = {}
