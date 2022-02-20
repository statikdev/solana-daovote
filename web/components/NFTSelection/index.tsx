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
  onSelectAction,
  selectedNFTMintAddress,
  walletAddress,
}: {
  connection: Connection;
  nftCreatorAddress: string;
  onSelectAction: (nftMintAddress: string) => void;
  selectedNFTMintAddress?: string;
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
          const borderColor =
            selectedNFTMintAddress === record.mintAddress
              ? '#000'
              : 'transparent';
          return (
            <span
              key={record.mintAddress}
              onClick={() => onSelectAction(record.mintAddress)}
              style={{
                borderBottom: `5px solid ${borderColor}`,
                cursor: 'pointer',
              }}
            >
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
