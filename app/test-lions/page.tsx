import React from 'react';
import { Cat, Crown, Star, Award } from 'lucide-react';
import { 
  GiLion, 
  GiTiger,
  GiTigerHead, 
  GiSaberToothedCatHead, 
  GiCat,
  GiHollowCat
} from 'react-icons/gi';
import { 
  FaAward, 
  FaCrown, 
  FaStar, 
  FaTrophy 
} from 'react-icons/fa';

const IconTestPage = () => {
  const iconStyle = {
    width: '48px',
    height: '48px'
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: '#FEF3C7',
    color: '#92400E',
    border: '1px solid #F59E0B',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '40px' }}>
          🦁 Profesjonelle Løve Ikoner for Film Awards
        </h1>

        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px 0', color: '#333', borderBottom: '2px solid #FFB800', paddingBottom: '10px' }}>
          Lucide React Ikoner (SVG - Høy kvalitet)
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <Cat style={{ ...iconStyle, color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Gull Katt (Lucide)</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Ren, profesjonell SVG katt/løve</div>
            <div style={badgeStyle}>
              <Cat style={{ width: '16px', height: '16px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <Cat style={{ ...iconStyle, color: '#C0C0C0' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Sølv Katt (Lucide)</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Samme ikon, sølv farge</div>
            <div style={badgeStyle}>
              <Cat style={{ width: '16px', height: '16px', color: '#C0C0C0' }} />
              Silver Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <Cat style={{ ...iconStyle, color: '#8B4513' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Bronse Katt (Lucide)</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Bronse farge for andre priser</div>
            <div style={badgeStyle}>
              <Cat style={{ width: '16px', height: '16px', color: '#8B4513' }} />
              Special Jury Prize
            </div>
          </div>
        </div>

        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px 0', color: '#333', borderBottom: '2px solid #FFB800', paddingBottom: '10px' }}>
          Game Icons (React Icons) - Mer Detaljerte
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <GiLion style={{ ...iconStyle, color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Helkropps Løve</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Løve fra siden, full kropp</div>
            <div style={badgeStyle}>
              <GiLion style={{ width: '16px', height: '16px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <GiTigerHead style={{ ...iconStyle, color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Tigerhode</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Kun hodet, mer kompakt</div>
            <div style={badgeStyle}>
              <GiTigerHead style={{ width: '16px', height: '16px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <GiSaberToothedCatHead style={{ ...iconStyle, color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Sabeltann Katt</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Mer dramatisk utseende</div>
            <div style={badgeStyle}>
              <GiSaberToothedCatHead style={{ width: '16px', height: '16px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>
        </div>

        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px 0', color: '#333', borderBottom: '2px solid #FFB800', paddingBottom: '10px' }}>
          Kombinasjoner med Andre Elementer
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <GiLion style={{ ...iconStyle, color: '#FFD700' }} />
              <Crown style={{ width: '24px', height: '24px', color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Løve + Krone</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Kombinasjon for Golden Lion</div>
            <div style={badgeStyle}>
              <GiLion style={{ width: '14px', height: '14px', color: '#FFD700' }} />
              <Crown style={{ width: '12px', height: '12px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <GiLion style={{ ...iconStyle, color: '#FFD700' }} />
              <Star style={{ width: '20px', height: '20px', color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Løve + Stjerne</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Alternativ kombinasjon</div>
            <div style={badgeStyle}>
              <GiLion style={{ width: '14px', height: '14px', color: '#FFD700' }} />
              <Star style={{ width: '12px', height: '12px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <GiLion style={{ ...iconStyle, color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Minimalistisk</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Kun løve, ingen tekst</div>
            <div style={badgeStyle}>
              <GiLion style={{ width: '16px', height: '16px', color: '#FFD700' }} />
              Venice 2023
            </div>
          </div>
        </div>

        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px 0', color: '#333', borderBottom: '2px solid #FFB800', paddingBottom: '10px' }}>
          Sammenligning med Nåværende
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              🏆
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Nåværende (Emoji)</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Standard pokal emoji</div>
            <div style={badgeStyle}>
              🏆 Golden Lion - Best Film
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <Award style={{ ...iconStyle, color: '#FFD700' }} />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Award Ikon (Fallback)</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Generisk award ikon som fallback</div>
            <div style={badgeStyle}>
              <Award style={{ width: '16px', height: '16px', color: '#FFD700' }} />
              Golden Lion
            </div>
          </div>
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', color: '#666' }}>
          <p><strong>Fordeler med SVG ikoner:</strong></p>
          <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
            <li>✅ <strong>Fargetilpasning:</strong> Kan bruke hvilken som helst farge (gull, sølv, bronse)</li>
            <li>✅ <strong>Skalerbar:</strong> Ser skarpe ut i alle størrelser</li>
            <li>✅ <strong>Konsistent:</strong> Samme stil på tvers av nettlesere</li>
            <li>✅ <strong>Plassbesparende:</strong> "Golden Lion" → løve ikon + "Golden"</li>
            <li>✅ <strong>Tematisk:</strong> Løve = Venice Film Festival</li>
          </ul>
          <p style={{ marginTop: '20px' }}><strong>Hvilken løve liker du best?</strong></p>
        </div>
      </div>
    </div>
  );
};

export default IconTestPage;