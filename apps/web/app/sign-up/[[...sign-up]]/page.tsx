import { SignUp } from '@clerk/nextjs'

export default function SignUpPage(): JSX.Element {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <SignUp />
    </div>
  )
}
