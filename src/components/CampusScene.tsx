import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Instances, Instance, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function CampusGround() {
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow><planeGeometry args={[14, 12]} /><meshStandardMaterial color="#272b26" roughness={1} /></mesh><gridHelper args={[14, 14, '#5d5544', '#363a34']} position={[0, -0.065, 0]} /></>
}

function Block({ position, size, color, roof = '#aa8a5d' }: { position: [number, number, number]; size: [number, number, number]; color: string; roof?: string }) {
  return <group position={position}><mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.88} /></mesh><mesh position={[0, size[1] + 0.025, 0]} castShadow><boxGeometry args={[size[0] + 0.12, 0.08, size[2] + 0.12]} /><meshStandardMaterial color={roof} roughness={0.76} /></mesh><mesh position={[0, size[1] * 0.48, size[2] / 2 + 0.012]}><planeGeometry args={[size[0] * 0.62, size[1] * 0.38]} /><meshStandardMaterial color="#d8b87f" emissive="#8b6432" emissiveIntensity={0.16} /></mesh></group>
}

function TreeLine({ positions }: { positions: [number, number, number][] }) {
  return <Instances limit={positions.length} range={positions.length} castShadow>
    <coneGeometry args={[0.36, 0.9, 5]} /><meshStandardMaterial color="#667a58" roughness={1} />
    {positions.map((position, index) => <Instance key={index} position={position} scale={[1, 1 + (index % 3) * 0.15, 1]} />)}
  </Instances>
}

function CampusModel({ surplus }: { surplus: number }) {
  const trees: [number, number, number][] = [[-4, 0.42, -3.5], [-3.3, 0.42, -3.6], [-2.6, 0.42, -3.5], [3.2, 0.42, -3.8], [4, 0.42, -3.6], [4.8, 0.42, -3.3], [-4.4, 0.42, 2.8], [4.4, 0.42, 2.5]]
  const crateCount = Math.max(1, Math.min(7, Math.ceil(surplus / 8)))
  const crates = useMemo(() => Array.from({ length: crateCount }, (_, index) => [-0.9 + (index % 4) * 0.34, 0.22, 1.5 + Math.floor(index / 4) * 0.34] as [number, number, number]), [crateCount])
  return <>
    <CampusGround />
    <Block position={[-3, 0, -0.4]} size={[2.1, 1.25, 1.8]} color="#65665d" />
    <Block position={[0.1, 0, -1.45]} size={[2.7, 1.8, 2.1]} color="#807260" roof="#c09a61" />
    <Block position={[3.15, 0, -0.3]} size={[2.25, 1.15, 1.8]} color="#526653" roof="#788765" />
    <Block position={[-3.2, 0, 2.6]} size={[1.7, 0.82, 1.3]} color="#5a6259" roof="#8e8065" />
    <TreeLine positions={trees} />
    <mesh position={[0.15, 0.12, 1.55]}><boxGeometry args={[1.65, 0.18, 0.85]} /><meshStandardMaterial color="#604e38" /></mesh>
    {crates.map((position, index) => <mesh key={index} position={position} castShadow><boxGeometry args={[0.24, 0.22, 0.24]} /><meshStandardMaterial color={index < Math.min(crateCount, 4) ? '#c7a46d' : '#806d4f'} roughness={0.85} /></mesh>)}
    <Line points={[[-1.1, 0.04, -0.1], [-0.4, 0.04, 0.6], [0.5, 0.04, 0.7], [1.8, 0.04, 0.1]]} color="#d9ac6d" lineWidth={1.4} transparent opacity={0.68} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.015, 0.45]}><ringGeometry args={[0.55, 0.57, 48]} /><meshBasicMaterial color="#d9ac6d" transparent opacity={0.85} side={THREE.DoubleSide} /></mesh>
  </>
}

export default function CampusScene({ surplus }: { surplus: number }) {
  return <Canvas dpr={[1, 1.35]} camera={{ position: [7.5, 7.2, 9], fov: 36 }} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} aria-hidden="true">
    <color attach="background" args={['#20211e']} />
    <ambientLight intensity={1.35} />
    <directionalLight position={[4, 8, 5]} intensity={2.2} color="#f1d7a9" />
    <directionalLight position={[-5, 4, -4]} intensity={0.8} color="#8f9b87" />
    <CampusModel surplus={surplus} />
    <OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={0.82} maxPolarAngle={1.22} minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} enableDamping dampingFactor={0.1} />
  </Canvas>
}
