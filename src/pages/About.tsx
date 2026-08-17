import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as z from 'zod';
import BackgroundBlobs from '../components/BackgroundBlobs';
import SEO from '../components/SEO';

import AboutHero from '../components/about/AboutHero';
import OurStory from '../components/about/OurStory';
import MissionVision from '../components/about/MissionVision';
import FounderSection from '../components/about/FounderSection';
import ValuesSection from '../components/about/ValuesSection';
import VerticalTimeline from '../components/about/VerticalTimeline';
import TeamSection from '../components/about/TeamSection';

const aboutSchema = z.object({
  story: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  founder: z.object({
    name: z.string(),
    title: z.string(),
    bio: z.string(),
    quote: z.string().optional(),
    photoUrl: z.string().optional()
  }).optional(),
  values: z.array(z.object({
    title: z.string(),
    desc: z.string(),
    iconKey: z.string()
  })).optional(),
  milestones: z.array(z.object({
    year: z.string(),
    title: z.string(),
    description: z.string()
  })).optional(),
  team: z.array(z.object({
    name: z.string(),
    role: z.string(),
    photoUrl: z.string().optional()
  })).optional()
});

const DEFAULT_ABOUT_DATA = {
  story: "FutureCodeAI was founded with a clear, uncompromising vision: to democratize advanced technology education by bringing top-tier software engineering, AI, and data science training directly to classrooms and coaching centers across India.",
  mission: "To equip 100,000+ ambitious students with industry-grade software engineering, AI, and problem-solving skills through hands-on project cohorts and live mentorship.",
  vision: "To be India's premier decentralized tech ecosystem connecting tier 2 & 3 cities with top global startups and tech careers.",
  founder: {
    name: "Ravi Ranjan Kumar",
    title: "Founder & Lead Architect",
    bio: "Passionate engineer, educator, and entrepreneur dedicated to building accessible software engineering education and practical tech ecosystems.",
    quote: "Real tech education isn't about rote learning; it's about shipping real code that changes lives.",
    photoUrl: "/logo.jpg"
  },
  values: [
    { title: "Hands-On First", desc: "Every concept is reinforced with practical code, live debugging, and real deployments.", iconKey: "code" },
    { title: "Accessible Excellence", desc: "Bringing Silicon-Valley caliber curriculum right to local coaching institutes and colleges.", iconKey: "target" },
    { title: "Career Acceleration", desc: "Industry recognized certificates, portfolio projects, and direct hiring referrals.", iconKey: "zap" },
    { title: "Lifelong Community", desc: "Join an active network of alumni, mentors, and fellow student developers across India.", iconKey: "users" }
  ],
  milestones: [
    { year: '2024', title: 'Founded FutureCode AI', description: 'Established with the mission to bridge the tech education gap across tier 2 & 3 cities with world-class curriculum.' },
    { year: '2025', title: 'Partnered with MSME & Colleges', description: 'Expanded hands-on training centers across 50+ institutes and launched government-recognized certification.' },
    { year: '2026', title: '5,000+ Students Certified', description: 'Pioneered AI & Full-Stack internship cohorts with 90%+ placement and internship assistance.' },
  ],
  team: [
    { name: "Ravi Ranjan Kumar", role: "Founder & Lead Educator" },
    { name: "Technical Advisory Board", role: "Industry Experts & Engineers" }
  ]
};

export default function About() {
  const [data, setData] = useState<any>(DEFAULT_ABOUT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const docRef = doc(db, 'pages', 'about');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const result = aboutSchema.safeParse(docSnap.data());
          if (result.success && result.data) {
            setData({
              ...DEFAULT_ABOUT_DATA,
              ...result.data
            });
          }
        }
      } catch (error) {
        console.error("Error fetching about page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, []);

  return (
    <div className="w-full relative bg-background min-h-screen">
      <SEO 
        title="About Us" 
        description="Learn more about FutureCodeAI, our mission to democratize tech education, and the team behind our innovative programs."
      />
      <BackgroundBlobs />
      
      <main className="w-full relative z-10">
        <AboutHero />
        
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {data.story && <OurStory text={data.story} />}
            {(data.mission || data.vision) && <MissionVision mission={data.mission || ''} vision={data.vision || ''} />}
            {data.founder && <FounderSection founder={data.founder} />}
            {data.values && data.values.length > 0 && <ValuesSection values={data.values} />}
            <VerticalTimeline milestones={data.milestones || DEFAULT_ABOUT_DATA.milestones} />
            {data.team && data.team.length > 0 && <TeamSection team={data.team} />}
          </>
        )}
      </main>
    </div>
  );
}
