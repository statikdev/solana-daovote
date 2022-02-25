import Header from '../Header';
import Footer from '../Footer';

export default function Layout({ children }: { children: any }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
