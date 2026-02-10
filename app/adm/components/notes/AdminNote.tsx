/* eslint-disable @next/next/no-img-element */
import { cn } from "@/utils/utils"
import { Marquee } from "@/components/ui/marquee"
import Image from "next/image"
import { AddedPageMessage } from "next/dist/server/dev/hot-reloader-types"

interface Reviews {
    photoProfile: string
    adm_usn: string
    username?: string
    notes: string
}


const ReviewCard = ({
    photoProfile: img,
    adm_usn: name,
    username,
    notes: body
}: {
    photoProfile: string
    adm_usn: string
    username?: string
    notes: string
}) => {
    return (
        <figure
            className={cn(
                "relative h-full w-full min-w-50  max-w-50 cursor-pointer overflow-hidden rounded-xl border p-4 sm:w-36",
                // light styles
                "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
                // dark styles  
                "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
            )}
        >
            <div className="flex flex-row items-center gap-2">
                <div className="relative w-10 h-10 rounded-full shrink-0">
                    <Image className="rounded-full  object-cover" fill alt="" src={img} />
                </div>
                <div className="flex flex-col">
                    <figcaption className="text-xs font-medium dark:text-white">
                        {name}
                    </figcaption>
                    {/* <p className="text-xs font-medium dark:text-white/40">{}</p> */}
                </div>
            </div>
            <blockquote className="mt-2 text-sm">{body}</blockquote>
        </figure>
    )
}

export function AdminNote({ reviews }: { reviews: Reviews[] }) {
    const firstRow = reviews.slice(0, reviews.length / 2)
    const secondRow = reviews.slice(reviews.length / 2, reviews.length)
    const thirdRow = reviews.slice(0, reviews.length / 2)
    const fourthRow = reviews.slice(reviews.length / 2)

    return (
        <div className="relative flex h-96 w-full flex-row items-center justify-center gap-4 overflow-hidden [perspective:300px]">
            <div
                className="flex flex-row items-center gap-1"
                style={{
                    transform:
                        "translateX(-110px) translateY(0px) translateZ(-130px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)",
                }}
            >
                <Marquee pauseOnHover vertical className="[--duration:20s]">
                    {firstRow.map((review) => (
                        <ReviewCard key={review.adm_usn} {...review} />
                    ))}
                </Marquee>
                <Marquee reverse pauseOnHover className="[--duration:25s]" vertical>
                    {secondRow.map((review) => (
                        <ReviewCard key={review.adm_usn} {...review} />
                    ))}
                </Marquee>
                <Marquee reverse pauseOnHover className="[--duration:28s]" vertical>
                    {thirdRow.map((review) => (
                        <ReviewCard key={review.adm_usn} {...review} />
                    ))}
                </Marquee>

            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 
    bg-gradient-to-b from-background via-background/60 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 
    bg-gradient-to-t from-background via-background/60 to-transparent" />

            <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r"></div>
            <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l"></div>
        </div>
    )
}
