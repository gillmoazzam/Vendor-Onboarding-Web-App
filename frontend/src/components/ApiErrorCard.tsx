import { CircleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function ApiErrorCard({ message = 'We could not load this information. Please refresh and try again.' }: { message?: string }) {
  return <Card className="border-red-100"><CardHeader><div className="flex items-center gap-3"><CircleAlert className="size-6 text-[#E8272C]" /><CardTitle>Something went wrong</CardTitle></div></CardHeader><CardContent><p>{message}</p></CardContent></Card>
}
