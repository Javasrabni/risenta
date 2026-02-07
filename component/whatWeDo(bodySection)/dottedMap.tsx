import { DottedMap } from "@/components/ui/dotted-map"

const markers = [
  { lat: -6.2088, lng: 106.8456, size: 0.3, color: "#ff44009a" },  // UI
  { lat: -6.8915, lng: 107.6107, size: 0.3, color: "#FF4500" }, // ITB
  { lat: -7.7701, lng: 110.3778, size: 0.3, color: "#FF4500" },  // UGM
  { lat: -7.2824, lng: 112.7949, size: 0.3, color: "#FF4500" }, // ITS
]


export default function DottedMaps() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="to-background absolute inset-0 bg-radial from-transparent to-70%" />
      <DottedMap markers={markers} />
    </div>
  )
}
