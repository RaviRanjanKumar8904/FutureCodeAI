import { useState, useEffect } from 'react';
import _CountUp from 'react-countup';
const CountUp = (_CountUp as any).default || _CountUp;
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface StatsData {
  students: number;
  institutes: number;
  courses: number;
  internships: number;
}

export default function StatsSection() {
  const [stats, setStats] = useState<StatsData>({
    students: 5000,
    institutes: 120,
    courses: 25,
    internships: 1000
  });

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px", amount: 0.15 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsDoc = await getDoc(doc(db, "platform", "stats"));
        if (statsDoc.exists()) {
          setStats(statsDoc.data() as StatsData);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, []);

  const statItems = [
    { label: "Students Trained", value: stats.students, suffix: "+" },
    { label: "Partner Institutes", value: stats.institutes, suffix: "+" },
    { label: "Courses Offered", value: stats.courses, suffix: "" },
    { label: "Internships Provided", value: stats.internships, suffix: "+" }
  ];

  return (
    <section className="py-20 bg-primary relative overflow-hidden text-white" ref={ref}>
      {/* Decorative Blobs */}
      <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[200%] bg-white/5 rounded-full blur-3xl transform rotate-12 pointer-events-none" />
      <div className="absolute top-[-50%] right-[-10%] w-[30%] h-[200%] bg-secondary/20 rounded-full blur-3xl transform -rotate-12 pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {statItems.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl md:text-6xl font-bold font-heading mb-2">
                {isInView ? (
                  <CountUp end={stat.value} duration={2.5} separator="," />
                ) : (
                  "0"
                )}
                {stat.suffix}
              </div>
              <div className="text-white/80 font-medium text-sm md:text-base uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
