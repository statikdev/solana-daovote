import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import styles from './index.module.css';

export default function Header() {
  return (
    <div className={styles.container}>
      <div className={styles.walletButtons}>
        <WalletMultiButton />
      </div>
    </div>
  );
}
