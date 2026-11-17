import Image from 'next/image';

export default function Header() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-mark">
          <Image src="/muster-logo.png" alt="Muster logo" width={42} height={34} priority />
        </div>
        <div className="brand-copy">
          <h1>Muster</h1>
          <span>Find your gaming partners</span>
        </div>
        <div className="header-status"><span /> Online community</div>
      </div>
    </header>
  );
}
