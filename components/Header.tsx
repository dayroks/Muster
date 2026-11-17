import Image from 'next/image';

export default function Header() {
  return (
    <header className="muster-header">
      <div className="muster-header__inner">
        <div className="muster-brand">
          <div className="muster-brand__mark">
            <Image src="/muster-logo.png" alt="Muster logo" width={48} height={48} priority />
          </div>
          <div>
            <h1 className="font-onest text-[22px] font-extrabold tracking-tight text-white">Muster</h1>
            <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">Find your gaming partners</p>
          </div>
        </div>
        <div className="muster-online"><span /> Online community</div>
      </div>
    </header>
  );
}
