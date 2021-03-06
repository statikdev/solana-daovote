import Image from 'next/image';
import Link from 'next/link';

const shortendAddr = (addr: string) => {
  return `${addr.substr(0, 6)}...${addr.substr(addr.length - 6, 6)}`;
};
export default function VoteHistory({
  proposalInfo,
  nftImages,
  proposalId,
  votes,
}: {
  proposalInfo: any;
  nftImages: any;
  proposalId: any;
  votes: any;
}) {
  const votesTable = votes.map((d: any) => {
    const mintData = nftImages
      .filter((mint: any) => !!mint.data)
      .find((record: any) => record.mint === d.mint)?.data;

    const voteOption = proposalInfo?.voteOptions?.find(
      (voteOption: any) => voteOption.value === Number(d.vote_option)
    );
    return (
      <tr key={d.mint}>
        <td className="d-flex justify-content-center">
          {mintData && mintData.image && (
            <img src={mintData.image} width="45px" height="45px" alt={d.mint} />
          )}
        </td>
        <td>
          <div className="d-flex flex-column">
            <span> {mintData?.name}</span>
            <code>
              <Link href={`https://solscan.io/account/${d.mint}`}>
                {shortendAddr(d.mint)}
              </Link>
            </code>
          </div>
        </td>
        <td>
          <code>
            <Link href={`https://solscan.io/account/${d.voter}`}>
              {shortendAddr(d.voter)}
            </Link>
          </code>
        </td>
        <td>{voteOption?.label}</td>
        <td>{d.time.toISOString()}</td>
      </tr>
    );
  });

  return (
    <>
      <h3 className='mt-5'>All Votes</h3>
      <table className="table table-sm table-light align-middle">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">NFT</th>
            <th scope="col">Voter Addr</th>
            <th scope="col">Vote Option</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>{votesTable}</tbody>
      </table>
    </>
  );
}
