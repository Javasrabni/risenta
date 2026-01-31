import { MorphingText } from "@/components/ui/morphing-text";

const texts = [
  "Hello",
  "Morphing",
  "Text",
  "Animation",
  "React",
  "Component",
  "Smooth",
  "Transition",
  "Engaging",
]

export function MorphingTexts() {
  return <MorphingText texts={texts} className="text-xs"/>
}
