import { RippleButton } from "@/components/ui/ripple-button"

export default function RippleBtn({ text }: { text: string }) {
  return (
    <div className="inline-block relative">
      <RippleButton
        rippleColor="rgba(173, 216, 230, 0.5)"
        className="px-6 py-3 rounded-md text-[12px] md:text-sm font-medium font-[inter]"
        onClick={() => console.log("clicked")}
      >
        {text}
      </RippleButton>
    </div>
  )
}
