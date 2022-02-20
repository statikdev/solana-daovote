import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { Connection, PublicKey } from '@solana/web3.js';

import { getNFTsForWallet } from '../../services/NFT';

type NFTWithMetadata = {
  imageUrl: string;
  mintAddress: string;
  name: string;
};

export default function NFTSelection({
  connection,
  nftCreatorAddress,
  walletAddress,
}: {
  connection: Connection;
  nftCreatorAddress: string;
  walletAddress: string;
}) {
  const [nftsWithMetadata, setNFTsWithMetadata] = useState<NFTWithMetadata[]>(
    []
  );

  useEffect(() => {
    async function retrieve() {
      const nfts = await getNFTsForWallet(
        connection,
        new PublicKey(walletAddress),
        nftCreatorAddress
      );

      const nftsWithData = nfts.map((nft: any) => ({
        imageUrl: nft.storageData?.image,
        mintAddress: nft.mint,
        name: nft.storageData?.name,
      }));

      setNFTsWithMetadata(nftsWithData);
    }
    retrieve();
  }, [connection, nftCreatorAddress, walletAddress]);

  return (
    <>
      <div>
        {nftsWithMetadata.map((record: NFTWithMetadata) => {
          return (
            <span key={record.mintAddress}>
              <Image
                src={record.imageUrl}
                width="100px"
                height="100px"
                alt={record.name}
              />
            </span>
          );
        })}
      </div>
    </>
  );
}
