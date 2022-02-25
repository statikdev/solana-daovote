import Image from 'next/image';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import styles from './index.module.css';

export default function Header() {
  return (
    <div className={styles.container}>
      <div className="d-flex w100 justify-content-center align-items-center pb-2">
        <Image
          src="/daosmb.png"
          alt="smb and monkeDAO logo"
          width="400px"
          height="90.5px"
        />
      </div>
      <div className={styles.walletButtons}>
        <WalletMultiButton />
      </div>
    </div>
  );
}
