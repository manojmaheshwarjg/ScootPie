import React, { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Stars, Float, useVideoTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import { TryOnResult } from '../types';
import { Box, Layers, Rotate3d, ScanFace, Maximize, Settings2, Sun, Grid3x3, Sparkles, PlayCircle, PauseCircle, X } from 'lucide-react';
import { ScannerLoader } from './ScannerLoader';
import { generate360View } from '../services/gemini';
import { toast } from 'sonner';

interface ThreeDViewProps {
  generatedLooks: TryOnResult[];
  onUpdateLook: (id: string, updates: Partial<TryOnResult>) => void;
}

const FALLBACK_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBgAAABAAEA6AM4/gAAAABJRU5ErkJggg==";

// --- 3D COMPONENTS ---

interface EnvSettings {
    autoRotate: boolean;
    showGrid: boolean;
    showParticles: boolean;
    lightIntensity: number;
}

interface HolographicPlaneProps {
    textureUrl?: string;
    videoUrl?: string | null;
    isAnimating: boolean;
    settings: EnvSettings;
}

const VolumetricHologram: React.FC<HolographicPlaneProps> = ({ 
    textureUrl, 
    videoUrl,
    isAnimating,
    settings
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load Texture
  const texture = useLoader(THREE.TextureLoader, (!videoUrl && textureUrl) ? textureUrl : FALLBACK_TEXTURE);
  
  useFrame((state, delta) => {
      if (meshRef.current && isAnimating && !videoUrl && settings.autoRotate) {
          // Additional subtle rotation if auto-rotate is on, adds to the floating effect
          meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      }
  });

  if (videoUrl) {
      return <VideoCylinder url={videoUrl} />;
  }

  return (
    <group>
        {/* Main Volumetric Relief */}
        <mesh ref={meshRef} position={[0, 0.5, 0]}>
            <planeGeometry args={[3.2, 4.2, 128, 128]} />
            <meshStandardMaterial 
                map={texture} 
                displacementMap={texture}
                displacementScale={0.4} // Actual geometric depth
                wireframe={false}
                transparent={true}
                opacity={0.9}
                side={THREE.DoubleSide}
                emissive="#ffffff"
                emissiveIntensity={0.2 * settings.lightIntensity}
                alphaTest={0.1}
            />
        </mesh>

        {/* Wireframe Ghost (adds tech feel) */}
        <mesh position={[0, 0.5, -0.1]} scale={[1.05, 1.05, 1]}>
             <planeGeometry args={[3.2, 4.2, 32, 32]} />
             <meshBasicMaterial 
                color="#f97316" 
                wireframe={true} 
                transparent 
                opacity={0.1 * settings.lightIntensity} 
             />
        </mesh>
    </group>
  );
};

// For 360 Video, we project onto a curved screen for immersion
const VideoCylinder = ({ url }: { url: string }) => {
    const texture = useVideoTexture(url);
    // Curved screen geometry: Radius 3, Height 5, Arc 90 degrees
    return (
        <group position={[0, 0.5, 0]}>
            <mesh>
                <cylinderGeometry args={[2.5, 2.5, 4.5, 64, 1, true, -Math.PI / 6, Math.PI / 3]} />
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {/* Frame for the screen */}
            <mesh position={[0, 2.3, 0]}>
                <torusGeometry args={[2.5, 0.02, 16, 64, Math.PI / 3]} />
                <meshBasicMaterial color="#f97316" />
            </mesh>
             <mesh position={[0, -2.3, 0]}>
                <torusGeometry args={[2.5, 0.02, 16, 64, Math.PI / 3]} />
                <meshBasicMaterial color="#f97316" />
            </mesh>
        </group>
    )
}

const TechPlatform = () => {
    return (
        <group position={[0, -2, 0]}>
            {/* Main Base */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[2, 64]} />
                <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
            </mesh>
            
            {/* Glowing Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[1.9, 2, 64]} />
                <meshBasicMaterial color="#f97316" />
            </mesh>

            {/* Grid Floor */}
            <Grid 
                args={[20, 20]} 
                cellSize={0.5} 
                cellThickness={0.5} 
                cellColor="#333" 
                sectionSize={3} 
                sectionThickness={1} 
                sectionColor="#f97316" 
                fadeDistance={30} 
            />

            {/* Emitter Beams */}
            {Array.from({ length: 8 }).map((_, i) => (
                <mesh key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]} position={[1.8, 0.5, 0]}>
                    <boxGeometry args={[0.1, 1, 0.1]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}
        </group>
    )
}

const Particles = () => {
   const count = 200;
   const positions = useMemo(() => {
     const pos = new Float32Array(count * 3);
     for(let i=0; i<count; i++) {
         pos[i*3] = (Math.random() - 0.5) * 6; // x
         pos[i*3+1] = (Math.random() - 0.5) * 6; // y
         pos[i*3+2] = (Math.random() - 0.5) * 6; // z
     }
     return pos;
   }, []);

   return (
       <points>
           <bufferGeometry>
               <bufferAttribute 
                 attach="attributes-position" 
                 count={count} 
                 array={positions} 
                 itemSize={3} 
               />
           </bufferGeometry>
           <pointsMaterial size={0.05} color="#f97316" transparent opacity={0.4} sizeAttenuation />
       </points>
   )
}

const Scene = ({ selectedLook, videoUrl, settings }: { selectedLook: TryOnResult | null, videoUrl: string | null, settings: EnvSettings }) => {
    return (
        <>
            <ambientLight intensity={settings.lightIntensity} />
            <pointLight position={[10, 10, 10]} intensity={settings.lightIntensity} color="#f97316" />
            <pointLight position={[-10, 5, -10]} intensity={settings.lightIntensity * 0.5} color="#00ffff" />
            <spotLight position={[0, 10, 0]} angle={0.5} penumbra={1} intensity={settings.lightIntensity * 2} color="#ffffff" castShadow />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            
            <group position={[0, 0, 0]}>
                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                    <Suspense fallback={<Text color="white" fontSize={0.5} position={[0,0,0]}>LOADING ASSETS...</Text>}>
                        <VolumetricHologram 
                            key={selectedLook?.id || 'empty'}
                            textureUrl={selectedLook?.imageUrl} 
                            videoUrl={videoUrl}
                            isAnimating={true}
                            settings={settings}
                        />
                    </Suspense>
                </Float>
            </group>

            {settings.showGrid && <TechPlatform />}
            {settings.showParticles && <Particles />}

            <OrbitControls 
                minPolarAngle={Math.PI / 4} 
                maxPolarAngle={Math.PI / 2} 
                enableZoom={true} 
                maxDistance={10}
                minDistance={3}
                autoRotate={settings.autoRotate}
                autoRotateSpeed={2}
            />
        </>
    );
};


export const ThreeDView: React.FC<ThreeDViewProps> = ({ generatedLooks, onUpdateLook }) => {
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'ENV'>('ASSETS');
  
  // Mobile Controls Overlay State
  const [showMobileControls, setShowMobileControls] = useState(false);

  // Environment Settings State
  const [envSettings, setEnvSettings] = useState<EnvSettings>({
      autoRotate: false,
      showGrid: true,
      showParticles: true,
      lightIntensity: 1
  });

  // Default to first look if available and none selected
  useEffect(() => {
      if (!selectedLookId && generatedLooks.length > 0) {
          setSelectedLookId(generatedLooks[0].id);
      }
  }, [generatedLooks]);

  const selectedLook = generatedLooks.find(l => l.id === selectedLookId) || null;
  // Use persistent videoUrl if available
  const currentVideoUrl = selectedLook?.videoUrl || null;

  const handleSelect = (id: string) => {
      setSelectedLookId(id);
  };

  const handleGenerate360 = async () => {
      if (!selectedLook || isGenerating || currentVideoUrl) return;
      
      setIsGenerating(true);
      try {
          const videoUrl = await generate360View(selectedLook.imageUrl);
          if (videoUrl) {
              onUpdateLook(selectedLook.id, { 
                  videoUrl: videoUrl,
                  videoStatus: 'complete'
              });
              toast.success("360° Simulation Ready");
              // setEnvSettings(prev => ({ ...prev, autoRotate: true }));
          } else {
              toast.error("Simulation Failed");
          }
      } catch (e) {
          console.error("Failed to gen 360", e);
          toast.error("Simulation Error");
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-black flex relative overflow-hidden">
      
      {/* 3D Canvas Area */}
      <div className="flex-1 relative z-10">
          <Canvas camera={{ position: [0, 1.5, 6], fov: 50 }}>
               <Scene selectedLook={selectedLook} videoUrl={currentVideoUrl} settings={envSettings} />
          </Canvas>

          {/* Overlay UI */}
          <div className="absolute top-8 left-8 pointer-events-none select-none">
              <h2 className="font-serif text-3xl md:text-5xl text-white italic drop-shadow-lg">Holo<span className="text-accent">Deck</span></h2>
              <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${currentVideoUrl ? 'bg-accent animate-ping' : 'bg-green-500 animate-pulse'}`} />
                  <p className="font-mono text-[8px] md:text-[10px] text-gray-300 uppercase tracking-[0.2em] bg-black/50 px-2 py-1 rounded border border-white/10 backdrop-blur">
                      {currentVideoUrl ? 'RUNNING TURNTABLE SIMULATION' : 'VOLUMETRIC RELIEF PROJECTION'}
                  </p>
              </div>
          </div>
          
          {/* MOBILE CONTROLS TOGGLE FAB */}
          <div className="md:hidden absolute bottom-8 right-8 z-50">
             <button
               onClick={() => setShowMobileControls(true)}
               className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] border-2 border-white"
             >
                 <Settings2 className="w-6 h-6" />
             </button>
          </div>

          {/* GENERATE 360 BUTTON */}
          {selectedLook && !currentVideoUrl && !isGenerating && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 w-full px-8 flex justify-center">
                   <button 
                     onClick={handleGenerate360}
                     className="group flex items-center justify-center gap-3 px-8 py-4 bg-black/80 text-white font-mono text-xs uppercase tracking-widest rounded-sm border border-accent/50 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:bg-accent hover:text-white transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(249,115,22,0.6)] w-full md:w-auto"
                   >
                       <Rotate3d className="w-5 h-5 group-hover:animate-spin" />
                       <span>Initialize 360° Sequence</span>
                   </button>
              </div>
          )}

          {isGenerating && (
              <div className="absolute inset-0 z-50">
                   {/* Removed nested backdrop-blur to prevent UI rendering artifacts on rounded elements */}
                   <ScannerLoader text="SYNTHESIZING 3D GEOMETRY..." className="w-full h-full bg-black/90" />
              </div>
          )}

          {/* Empty State */}
          {!selectedLook && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="text-center opacity-50">
                       <ScanFace className="w-16 h-16 text-gray-500 mx-auto mb-4 animate-pulse" />
                       <p className="font-mono text-sm text-white tracking-widest uppercase">System Idle // Select Asset</p>
                   </div>
               </div>
          )}
      </div>

      {/* Right Sidebar: Tabs & Controls (Desktop: Static | Mobile: Overlay) */}
      <div className={`
          border-l border-white/10 bg-zinc-950/95 backdrop-blur-xl flex flex-col z-50 shadow-2xl transition-all duration-300
          absolute md:relative inset-0 md:inset-auto md:w-80 md:flex
          ${showMobileControls ? 'flex' : 'hidden'}
      `}>
          {/* Mobile Close Header */}
          <div className="md:hidden p-4 border-b border-white/10 flex justify-between items-center">
              <span className="font-serif text-white italic">Configuration</span>
              <button onClick={() => setShowMobileControls(false)} className="p-2 text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
              </button>
          </div>

          {/* Sidebar Header / Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
              <button 
                onClick={() => setActiveTab('ASSETS')}
                className={`flex-1 py-4 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'ASSETS' ? 'text-accent border-b-2 border-accent bg-white/5' : 'text-gray-500 hover:text-white'}
                `}
              >
                  <Box className="w-4 h-4" /> Assets
              </button>
              <button 
                onClick={() => setActiveTab('ENV')}
                className={`flex-1 py-4 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'ENV' ? 'text-accent border-b-2 border-accent bg-white/5' : 'text-gray-500 hover:text-white'}
                `}
              >
                  <Settings2 className="w-4 h-4" /> Controls
              </button>
          </div>

          {activeTab === 'ASSETS' ? (
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {generatedLooks.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Maximize className="w-8 h-8 mx-auto mb-4 text-gray-600" />
                        <p className="text-xs font-mono uppercase tracking-wider text-gray-500">No assets in buffer</p>
                    </div>
                ) : (
                    generatedLooks.map(look => (
                        <button 
                            key={look.id}
                            onClick={() => handleSelect(look.id)}
                            className={`w-full flex items-center gap-4 p-3 rounded border transition-all group text-left relative overflow-hidden
                                ${selectedLookId === look.id 
                                    ? 'bg-white/5 border-accent' 
                                    : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                                }
                            `}
                        >
                            {selectedLookId === look.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>}
                            
                            <div className="w-12 h-16 bg-zinc-900 rounded-sm overflow-hidden relative border border-white/10">
                                <img src={look.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                {look.videoUrl && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                        <Rotate3d className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`font-serif text-sm truncate leading-tight mb-1 ${selectedLookId === look.id ? 'text-accent' : 'text-gray-200'}`}>
                                    {look.product.name}
                                </h4>
                                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wide">{look.product.brand}</p>
                            </div>
                            {selectedLookId === look.id && <Layers className="w-4 h-4 text-accent animate-pulse" />}
                        </button>
                    ))
                )}
             </div>
          ) : (
             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 {/* Auto Rotate Control */}
                 <div>
                     <label className="flex items-center justify-between text-white font-mono text-xs uppercase tracking-widest mb-4">
                         <span>Auto Rotation</span>
                         {envSettings.autoRotate ? <PlayCircle className="w-4 h-4 text-accent" /> : <PauseCircle className="w-4 h-4 text-gray-500" />}
                     </label>
                     <button 
                        onClick={() => setEnvSettings(prev => ({...prev, autoRotate: !prev.autoRotate}))}
                        className={`w-full py-2 rounded border transition-colors font-mono text-xs
                            ${envSettings.autoRotate ? 'bg-accent text-white border-accent' : 'bg-black border-white/20 text-gray-400 hover:text-white'}
                        `}
                     >
                         {envSettings.autoRotate ? 'ENABLED' : 'DISABLED'}
                     </button>
                 </div>

                 {/* Brightness Control */}
                 <div>
                     <label className="flex items-center gap-2 text-white font-mono text-xs uppercase tracking-widest mb-4">
                         <Sun className="w-4 h-4" /> Brightness
                     </label>
                     <input 
                        type="range" 
                        min="0" 
                        max="3" 
                        step="0.1" 
                        value={envSettings.lightIntensity}
                        onChange={(e) => setEnvSettings(prev => ({...prev, lightIntensity: parseFloat(e.target.value)}))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                     />
                     <div className="flex justify-between mt-2 text-[9px] font-mono text-gray-500">
                         <span>DIM</span>
                         <span>BRIGHT</span>
                     </div>
                 </div>

                 {/* Toggle Grid */}
                 <div className="flex items-center justify-between py-2 border-b border-white/10">
                     <div className="flex items-center gap-3">
                         <Grid3x3 className={`w-4 h-4 ${envSettings.showGrid ? 'text-white' : 'text-gray-600'}`} />
                         <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">Holo-Grid</span>
                     </div>
                     <button 
                         onClick={() => setEnvSettings(prev => ({...prev, showGrid: !prev.showGrid}))}
                         className={`w-10 h-5 rounded-full relative transition-colors ${envSettings.showGrid ? 'bg-accent' : 'bg-gray-700'}`}
                     >
                         <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${envSettings.showGrid ? 'translate-x-5' : ''}`} />
                     </button>
                 </div>

                 {/* Toggle Particles */}
                 <div className="flex items-center justify-between py-2 border-b border-white/10">
                     <div className="flex items-center gap-3">
                         <Sparkles className={`w-4 h-4 ${envSettings.showParticles ? 'text-white' : 'text-gray-600'}`} />
                         <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">Particles</span>
                     </div>
                     <button 
                         onClick={() => setEnvSettings(prev => ({...prev, showParticles: !prev.showParticles}))}
                         className={`w-10 h-5 rounded-full relative transition-colors ${envSettings.showParticles ? 'bg-accent' : 'bg-gray-700'}`}
                     >
                         <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${envSettings.showParticles ? 'translate-x-5' : ''}`} />
                     </button>
                 </div>
             </div>
          )}
      </div>
    </div>
  );
};