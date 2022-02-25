import Image from 'next/image';

import Header from '../Header';
import Footer from '../Footer';

export default function Layout({ children }: { children: any }) {
  return (
    <>
      <Header />
      <div className="d-flex w100 justify-content-center align-items-center pb-2">
        <Image
          src="/daosmb.png"
          alt="smb and monkeDAO logo"
          width="400px"
          height="90.5px"
        />
      </div>
      <div className="d-flex w100 justify-content-center align-items-center pb-2 mt-1">
        <h1 className="display-4 fw-normal">DAO Vote</h1>
      </div>
      <main>{children}</main>
      <Footer />
    </>
  );
}
