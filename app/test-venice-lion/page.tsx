import React from 'react';
import { GiLion } from 'react-icons/gi';

export default function TestLionPage() {
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#FEF3C7',
    border: '1px solid #F59E0B',
    color: '#92400E'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '40px' }}>
          🦁 GiLion Icon fra Game Icons
        </h1>

        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px 0', color: '#333', borderBottom: '2px solid #FFB800', paddingBottom: '10px' }}>
          Venice Film Festival Awards med GiLion-ikon
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <GiLion size={48} color="#FFD700" />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Golden Lion</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Hovedpris fra Venezia</div>
            <div style={badgeStyle}>
              <GiLion size={14} color="#FFD700" />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <GiLion size={48} color="#C0C0C0" />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Silver Lion</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Sølvløve for regissør/manus</div>
            <div style={badgeStyle}>
              <GiLion size={14} color="#C0C0C0" />
              Silver Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <GiLion size={48} color="#CD7F32" />
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Special Award</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Andre priser fra Venezia</div>
            <div style={badgeStyle}>
              <GiLion size={14} color="#CD7F32" />
              Special Jury Prize
            </div>
          </div>

        </div>

        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px 0', color: '#333', borderBottom: '2px solid #FFB800', paddingBottom: '10px' }}>
          Sammenligning med andre festivaler
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Venice (GiLion)</div>
            <div style={badgeStyle}>
              <GiLion size={14} color="#FFD700" />
              Golden Lion
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Cannes (Trophy)</div>
            <div style={badgeStyle}>
              <span>🏆</span>
              Palme d'Or
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Berlin (Trophy)</div>
            <div style={badgeStyle}>
              <span>🏆</span>
              Golden Bear
            </div>
          </div>

          <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>BIFF (Trophy)</div>
            <div style={badgeStyle}>
              <span>🏆</span>
              Best Norwegian
            </div>
          </div>

        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', color: '#666' }}>
          <p><strong>Resultat:</strong></p>
          <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
            <li>✅ <strong>Unikt for Venice:</strong> GiLion-ikon kun for Venice Film Festival awards</li>
            <li>✅ <strong>Farge-kodet:</strong> Gull, sølv og bronse automatisk basert på prisnavn</li>
            <li>✅ <strong>Profesjonell:</strong> SVG fra Game Icons biblioteket</li>
            <li>✅ <strong>Konsistent:</strong> Trophy-emoji for alle andre festivaler</li>
            <li>✅ <strong>Perfekt silhuett:</strong> Klassisk løve-profil som du valgte</li>
          </ul>
        </div>
      </div>
    </div>
  );
}