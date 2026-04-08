import RisenttaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";

// Fixed team order
const TEAM_ORDER = [
    "Javas Anggaraksa Rabbani",
    "Rasyid Ali Nurhakim",
    "Fiska Andini Putri",
    "Saskia Hanina Sadiyah",
    "Daffa Adnan Asyarof",
    "M. Albar Hakim"
];

export async function GET() {
    try {
        await connectDB();
        const admins = await RisenttaAdm.find({}, 'adm_usn photoProfile cloudinaryPublicId position').lean();
        
        // Create a map of admins by name for quick lookup
        const adminMap = new Map(admins.map(admin => [admin.adm_usn, admin]));
        
        // Build team data in fixed order
        const teamData = TEAM_ORDER.map(name => {
            const admin = adminMap.get(name);
            let imageUrl = `/Assets/team/${name.replaceAll(' ', '')}.jpeg`;
            
            // If admin has Cloudinary URL, use it
            if (admin?.photoProfile && admin.photoProfile.includes('cloudinary')) {
                imageUrl = admin.photoProfile;
            } else if (admin?.photoProfile) {
                // Use URL if available
                imageUrl = admin.photoProfile;
            }
            
            return {
                name,
                imageUrl,
                role: admin?.position || getRoleFromName(name)
            };
        });

        return NextResponse.json({ team: teamData });
    } catch (error) {
        console.error("Get team error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

function getRoleFromName(name: string): string {
    const roles: Record<string, string> = {
        "Javas Anggaraksa Rabbani": "Law & Software Engineer",
        "Rasyid Ali Nurhakim": "Public Health",
        "Fiska Andini Putri": "Accounting/Finance",
        "Saskia Hanina Sadiyah": "Communication Science",
        "Daffa Adnan Asyarof": "History",
        "M. Albar Hakim": "Industrial Engineering"  
    };
    return roles[name] || "Team Member";
}
