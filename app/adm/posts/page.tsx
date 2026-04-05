import { PostsSection } from '../components/posts/PostsSection'

export default function PostsPage() {
    return (
        <div className="w-full h-full flex flex-col gap-6 font-[inter] relative overflow-hidden pt-8">
            <PostsSection />
        </div>
    )
}
