import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import BackgroundBlobs from '../components/BackgroundBlobs';
import VerifyHero from '../components/verify/VerifyHero';
import ResultCard from '../components/verify/ResultCard';
import ExplainerSection from '../components/verify/ExplainerSection';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const [certificateId, setCertificateId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'revoked'>('idle');
  const [data, setData] = useState<any | null>(null);

  const checkRateLimit = () => {
    const now = Date.now();
    const attemptsStr = sessionStorage.getItem('verifyAttempts');
    let attempts = attemptsStr ? JSON.parse(attemptsStr) : [];
    
    // Filter attempts within the last 1 minute (60000ms)
    attempts = attempts.filter((timestamp: number) => now - timestamp < 60000);
    
    if (attempts.length >= 5) {
      return false; // Rate limited
    }
    
    attempts.push(now);
    sessionStorage.setItem('verifyAttempts', JSON.stringify(attempts));
    return true;
  };

  const handleVerify = useCallback(async (idToVerify?: string) => {
    const id = typeof idToVerify === 'string' ? idToVerify : certificateId;
    if (!id.trim()) return;

    if (!checkRateLimit()) {
      toast.error("You have exceeded the maximum number of verification attempts. Please try again in a minute.");
      return;
    }

    setStatus('loading');
    setData(null);

    try {
      // Artificial delay to mitigate rapid enumeration
      await new Promise(resolve => setTimeout(resolve, 800));

      const cleanId = id.trim();
      let docData: any = null;
      let found = false;

      // 1. Direct document ID lookup
      const docRef = doc(db, 'certificates', cleanId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        docData = { id: docSnap.id, ...docSnap.data() };
        found = true;
      } else {
        // 2. Fallback: Secondary lookup by certificateId field
        try {
          const q = query(collection(db, 'certificates'), where('certificateId', '==', cleanId), limit(1));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const firstDoc = querySnap.docs[0];
            docData = { id: firstDoc.id, ...firstDoc.data() };
            found = true;
          }
        } catch (queryErr) {
          console.warn("Secondary certificate query failed:", queryErr);
        }
      }
      
      // Fire-and-forget log of the verification attempt
      try {
        await addDoc(collection(db, 'verificationLogs'), {
          certificateId: cleanId,
          timestamp: serverTimestamp(),
          found,
          userAgent: navigator.userAgent
        });
      } catch (logErr) {
        console.warn("Failed to log verification attempt", logErr);
      }

      if (found && docData) {
        setData(docData);
        if (docData.revoked === true) {
          setStatus('revoked');
        } else {
          setStatus('success');
        }
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error("Error fetching certificate:", error);
      setStatus('error');
    }
  }, [certificateId]);

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) {
      setCertificateId(urlId);
      handleVerify(urlId);
    }
  }, [searchParams, handleVerify]);

  return (
    <div className="w-full relative bg-background min-h-screen">
      <SEO 
        title="Verify Certificate" 
        description="Verify the authenticity of FutureCodeAI issued certificates using our secure online verification system."
      />
      <BackgroundBlobs />
      
      <main className="w-full relative z-10">
        <VerifyHero 
          certificateId={certificateId}
          setCertificateId={setCertificateId}
          onVerify={() => handleVerify()}
          isLoading={status === 'loading'}
        />
        <ResultCard status={status} data={data} />
        <ExplainerSection />
      </main>
    </div>
  );
}
