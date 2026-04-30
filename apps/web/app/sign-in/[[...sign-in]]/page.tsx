import { SignIn } from '@clerk/nextjs'

export default function SignInPage(): JSX.Element {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <SignIn />
    </div>
  )
}
