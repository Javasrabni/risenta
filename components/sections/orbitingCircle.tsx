import { OrbitingCircles } from '@/components/ui/orbiting-circles'
import { cn } from '@/lib/utils';
import { 
    Gavel,          
    Activity,       
    MessageSquare,  
    Scroll,         
    Settings,       
    Search          
} from "lucide-react"

const OrbitingCircle = () => {
    const rotationY = -11;

    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">

            {/* Style Tag untuk Animasi Glow Halus (Breathing Effect) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes orbit-glow {
                    0%, 100% { 
                        filter: drop-shadow(0 0 8px rgba(148,163,184,0.4)) drop-shadow(0 0 20px rgba(148,163,184,0.2)); 
                        opacity: 0.7; 
                    }
                    50% { 
                        filter: drop-shadow(0 0 15px rgba(148,163,184,0.7)) drop-shadow(0 0 35px rgba(148,163,184,0.4)); 
                        opacity: 1; 
                    }
                }
                .animate-glow-pulse {
                    animation: orbit-glow 3s ease-in-out infinite;
                }
            `}} />

            {/* WRAPPER PERSPEKTIF */}
            <div
                className={cn(
                    "relative flex items-center justify-center w-full h-full",
                    "scale-[1.2] sm:scale-100 md:scale-100 translate-y-[50px]",
                    // Masking diperbaiki untuk handle light mode (menggunakan warna black sebagai masker, bukan warna visual)
                    "mask-[linear-gradient(to_bottom,black_15%,rgba(0,0,0,0.5)_60%,transparent_90%)]",
                    "sm:mask-[linear-gradient(to_right,black_15%,rgba(0,0,0,0.5)_60%,transparent_90%)]"
                )}
                style={{
                    perspective: "50px",
                }}
            >

                <div
                    style={{
                        transform: `rotateY(${rotationY}deg)`,
                        transformStyle: "preserve-3d",
                    }}
                    className="relative flex items-center justify-center"
                >
                    {/* GARIS ORBIT - Ditambahkan class stroke agar adaptif */}
                    <svg className="absolute pointer-events-none overflow-visible" width="400" height="400">
                        <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20 text-slate-900 dark:text-white" />
                        <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20 text-slate-900 dark:text-white" />
                    </svg>

                    {/* Orbit Luar */}
                    <OrbitingCircles
                        iconSize={40}
                        radius={190}
                        className="border-none bg-transparent"
                    >
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Gavel className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Activity className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <MessageSquare className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Scroll className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Settings className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                    </OrbitingCircles>

                    {/* Orbit Dalam */}
                    <OrbitingCircles
                        radius={100}
                        reverse
                        className="border-none bg-transparent"
                    >
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Search className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Search className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                        <div style={{ transform: `rotateY(${-rotationY}deg)` }} className="animate-glow-pulse">
                            <Search className="text-slate-900 dark:text-white fill-slate-900/10 dark:fill-white/20" size={30} />
                        </div>
                    </OrbitingCircles>
                </div>
            </div>
        </div>
    )
}

export default OrbitingCircle