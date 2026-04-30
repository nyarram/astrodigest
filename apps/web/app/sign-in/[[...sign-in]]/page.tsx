import { SignIn } from '@clerk/nextjs'

export default function SignInPage(): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
      }}
    >
      <SignIn />
    </div>
  )
}
