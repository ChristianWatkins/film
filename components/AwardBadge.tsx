import React from 'react';
import { GiLion, GiPolarBear, GiPalmTree } from 'react-icons/gi';

interface AwardBadgeProps {
  awards: Array<{
    award: string;
    festival: string;
    year: number;
  }>;
  compact?: boolean; // New prop for compact mode
  maxShow?: number; // Max number of awards to show
}

// Award priority levels (higher number = more prestigious)
const AWARD_PRIORITY: Record<string, number> = {
  // Top tier awards
  'Palme d\'Or': 100,
  'Golden Lion - Best Film': 95,
  'Golden Bear - Best Film': 90,
  
  // Second tier
  'Grand Prix': 85,
  'Silver Lion - Grand Jury Prize': 80,
  'Silver Bear - Grand Jury Prize': 80,
  'Jury Prize': 75,
  
  // Direction awards
  'Silver Lion - Best Director': 70,
  'Silver Bear - Best Director': 70,
  'Best Director': 70,
  
  // Acting awards
  'Coppa Volpi - Best Actress': 65,
  'Coppa Volpi - Best Actor': 65,
  'Silver Bear - Best Leading Performance': 65,
  'Best Actress': 65,
  'Best Actor': 65,
  
  // Screenplay
  'Silver Bear - Best Screenplay': 60,
  'Best Screenplay': 60,
  
  // Special mentions and other awards get lower priority
};

// Get priority for an award
function getAwardPriority(award: string): number {
  // Check for exact match
  if (AWARD_PRIORITY[award]) {
    return AWARD_PRIORITY[award];
  }
  
  // Check for partial matches for common patterns
  if (award.includes('Palme d\'Or')) return 100;
  if (award.includes('Golden Lion')) return 95;
  if (award.includes('Golden Bear')) return 90;
  if (award.includes('Grand Prix')) return 85;
  if (award.includes('Silver Lion')) return 80;
  if (award.includes('Silver Bear')) return 75;
  if (award.includes('Best Director')) return 70;
  if (award.includes('Best Actor') || award.includes('Best Actress')) return 65;
  if (award.includes('Jury Prize')) return 60;
  if (award.includes('Special Jury')) return 55;
  
  // Default priority for other awards
  return 30;
}

// Sort awards by priority
function sortAwardsByPriority(awards: Array<{award: string, festival: string, year: number}>): Array<{award: string, festival: string, year: number}> {
  return [...awards].sort((a, b) => getAwardPriority(b.award) - getAwardPriority(a.award));
}

// Map long award names to shorter versions
const AWARD_ABBREVIATIONS: Record<string, string> = {
  // Venice
  'Venice Short Film Nomination for European Film Awards': 'Venice Short EFA Nom.',
  'Orizzonti Extra - Armani Beauty Audience Award': 'Orizzonti Audience',
  'Marcello Mastroianni Award - Best Young Actor/Actress': 'Mastroianni Award',
  'Lion of the Future - Luigi De Laurentiis Award': 'Lion of the Future',
  'Venice Classics - Best Documentary on Cinema': 'Venice Classics Doc',
  'Venice Classics - Best Restored Film': 'Venice Classics',
  
  // BIFF
  'Documentaire Extraordinaire - Hederlig omtale': 'Doc Extraordinaire HM',
  'Propaganda Nights - Hederlig omtale': 'Propaganda Nights HM',
  'Beste norske kortfilm - Hederlig omtale': 'Beste kortfilm HM',
  'Beste norske kortdokumentar - Hederlig omtale': 'Beste kortdok HM',
  'Beste kortreiste kortfilm - Hederlig omtale': 'Beste kortreise HM',
  'Beste norske musikkvideo - Hederlig omtale': 'Beste musikkvideo HM',
  'Ungdommens dokumentarfilmpris': 'Ungdommens pris',
  
  // Berlin
  'Silver Bear - Outstanding Artistic Contribution': 'Silver Bear - Artistic',
  'Silver Bear - Best Leading Performance': 'Silver Bear - Lead',
  'Silver Bear - Best Supporting Performance': 'Silver Bear - Support',
  
  // Cannes
  '75th Anniversary Prize': '75th Anniversary'
};

// Get display name for award
function getDisplayName(award: string, compact: boolean = false, isSpecialFestival: boolean = false): string {
  if (!compact) return award;
  
  // Check for exact match first
  if (AWARD_ABBREVIATIONS[award]) {
    return AWARD_ABBREVIATIONS[award];
  }
  
  // Venice and Berlin awards can be longer since they'll have prefixes removed
  const maxLength = isSpecialFestival ? 35 : 25;
  const truncateLength = isSpecialFestival ? 30 : 22;
  
  // Smart truncation for other long awards
  if (award.length > maxLength) {
    // Try to find a good breaking point
    const parts = award.split(' - ');
    if (parts.length > 1) {
      // If it has " - ", take the most important part
      const mainPart = parts[0];
      const subPart = parts[1];
      
      // If main part is short enough, add abbreviated sub part
      if (mainPart.length <= (isSpecialFestival ? 25 : 20)) {
        const shortSub = subPart.length > 10 ? subPart.substring(0, 10) + '...' : subPart;
        return `${mainPart} - ${shortSub}`;
      }
      return mainPart.length <= maxLength ? mainPart : mainPart.substring(0, truncateLength) + '...';
    }
    
    // For other long awards, smart truncate
    return award.substring(0, truncateLength) + '...';
  }
  
  return award;
}

export default function AwardBadge({ awards, compact = false, maxShow = compact ? 2 : 3 }: AwardBadgeProps) {
  if (!awards || awards.length === 0) return null;
  
  // Sort awards by priority and limit display
  const sortedAwards = sortAwardsByPriority(awards);
  const displayAwards = sortedAwards.slice(0, maxShow);
  const remainingCount = awards.length - displayAwards.length;
  
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {displayAwards.map((awardObj, idx) => {
        // Check festival types
        const isVeniceAward = awardObj.festival.toLowerCase().includes('venice') || awardObj.festival.toLowerCase().includes('venezia');
        const isBerlinAward = awardObj.festival.toLowerCase().includes('berlin') || awardObj.festival.toLowerCase().includes('berlinale');
        const isCannesAward = awardObj.festival.toLowerCase().includes('cannes');
        
        // For Venice awards, clean up the award text BEFORE applying getDisplayName
        let cleanedAward = awardObj.award;
        if (isVeniceAward) {
          cleanedAward = cleanedAward
            .replace(/^Award for\s+/i, '')
            .replace(/^Marcello Mastroianni Award\s*-?\s*/i, '')
            .replace(/^Mastroianni Award\s*-?\s*/i, '')
            .replace(/^Coppa Volpi\s*-?\s*/i, '')
            .replace(/^Golden Lion\s*-?\s*/i, '')
            .replace(/^Silver Lion\s*-?\s*/i, '')
            .trim();
          
          // If nothing left after removing text, use a generic label based on original award
          if (!cleanedAward) {
            cleanedAward = awardObj.award.toLowerCase().includes('golden') ? 'Best Film' : 
                          awardObj.award.toLowerCase().includes('silver') ? 'Grand Jury' : 
                          'Special Award';
          }
        } else if (isBerlinAward) {
          cleanedAward = cleanedAward
            .replace(/^Award for\s+/i, '')
            .replace(/^Golden Bear\s*-?\s*/i, '')
            .replace(/^Silver Bear\s*-?\s*/i, '')
            .trim();
          
          // If nothing left after removing text, use a generic label based on original award
          if (!cleanedAward) {
            cleanedAward = awardObj.award.toLowerCase().includes('golden') ? 'Best Film' : 
                          awardObj.award.toLowerCase().includes('silver') ? 'Jury Prize' : 
                          'Special Award';
          }
        }
        
        let displayName = getDisplayName(cleanedAward, compact, isVeniceAward || isBerlinAward);
        
        // Remove general redundant text for other festivals
        if (!isVeniceAward && !isBerlinAward) {
          displayName = displayName.replace(/^Award for\s+/i, '').trim();
        }        const isAbbreviated = displayName !== awardObj.award;
        
        // Create full tooltip with festival and award name
        const fullTooltip = `${awardObj.festival} ${awardObj.year}: ${awardObj.award}`;
        
        // Simple, consistent color for all awards
        const getColorClasses = () => {
          return compact 
            ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200' 
            : 'bg-gray-200 text-gray-800 border-gray-400';
        };
        
        return (
          <span
            key={idx}
            title={fullTooltip} // Always show full info: festival + year + award
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${getColorClasses()}`}
          >
            {/* Use specific icons for Venice (lion), Berlin (bear), Cannes (palm tree), trophy for others */}
            {isVeniceAward ? (
              <GiLion 
                size={14} 
                color={awardObj.award.toLowerCase().includes('golden') ? '#FFD700' : 
                       awardObj.award.toLowerCase().includes('silver') ? '#C0C0C0' : 
                       '#CD7F32'} 
              />
            ) : isBerlinAward ? (
              <GiPolarBear 
                size={14} 
                color={awardObj.award.toLowerCase().includes('golden') ? '#FFD700' : 
                       awardObj.award.toLowerCase().includes('silver') ? '#C0C0C0' : 
                       '#CD7F32'} 
              />
            ) : isCannesAward ? (
              <GiPalmTree 
                size={14} 
                color={awardObj.award.toLowerCase().includes('palme') ? '#FFD700' : 
                       awardObj.award.toLowerCase().includes('grand prix') ? '#C0C0C0' : 
                       '#CD7F32'} 
              />
            ) : (
              <span>🏆</span>
            )}
            <span className={compact ? ((isVeniceAward || isBerlinAward) ? 'max-w-[150px] truncate' : 'max-w-[120px] truncate') : undefined}>
              {displayName}
            </span>
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span
          title={`${remainingCount} more award${remainingCount > 1 ? 's' : ''}: ${sortedAwards.slice(maxShow).map(a => `${a.festival}: ${a.award}`).join(', ')}`}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
            compact 
              ? 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100' 
              : 'bg-gray-100 text-gray-800 border-gray-400'
          }`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

