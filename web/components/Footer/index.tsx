import styles from './index.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      DAO Vote | [
      <a
        href="https://github.com/Flawm/solana-dao-vote"
        target="_blank"
        rel="noopener noreferrer"
      >
        contract
      </a>
      ] [
      <a
        href="https://github.com/statikdev/solana-daovote"
        target="_blank"
        rel="noopener noreferrer"
      >
        web
      </a>
      ]
      [
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSfrDO-K8bSsSs36-tP9mv9kTr8wj08WGU6eL_h6c_-a9liKDg/viewform"
        target="_blank"
        rel="noopener noreferrer"
      >
        contact support
      </a>
      ]
    </footer>
  );
}
