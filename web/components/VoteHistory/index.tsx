import Image from 'next/image';

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
  const votesView = votes.map((d: any) => {
    const mintData = nftImages
      .filter((mint: any) => !!mint.data)
      .find((record: any) => record.mint === d.mint)?.data;

    const voteOption = proposalInfo?.voteOptions?.find(
      (voteOption: any) => voteOption.value === Number(d.vote_option)
    );
    return (
      <div
        className="col-4"
        key={d.time.toISOString()}
        d-flex
        align-items-stretch
      >
        <div className="card">
          <div className="card-body">
            {mintData && mintData.name && (
              <h5 className="card-title">{mintData.name}</h5>
            )}
            <h6 className="card-subtitle mb-3 text-muted">{d.mint}</h6>{' '}
            {mintData && mintData.image && (
              <Image
                src={mintData.image}
                width="100px"
                height="100px"
                alt={d.mint}
              />
            )}
          </div>
          <div className="card-footer bg-dark">
            <small className="text-white">
              <h6>
                {d.voter} voted for {voteOption?.label}
              </h6>
            </small>
          </div>
        </div>
      </div>
    );
  });

  return (
    <>
      <h3>All Votes</h3>
      <div className="row gx-3 gy-3">{votesView}</div>
    </>
  );
}
