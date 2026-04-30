import { SignIn } from '@clerk/nextjs'

export default function SignInPage(): JSX.Element {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4">
      <SignIn />
    </div>
  )
}
