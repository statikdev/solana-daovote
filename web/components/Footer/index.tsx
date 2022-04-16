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
    </footer>
  );
}
