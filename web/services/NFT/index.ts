import { Connection, PublicKey } from '@solana/web3.js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

export async function getMetadataForMint(
  connection: Connection,
  tokenAddress: PublicKey
) {
  const nftPDA = await Metadata.getPDA(tokenAddress);

  const metadata = await Metadata.load(connection, nftPDA);
  return metadata;
}

const TOKEN_PROGRAM_ADDRESS = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

export async function retrieveStorageDataForUrl(uri: string) {
  const response = await fetch(uri);
  return await response.json();
}

export async function getNFTsForWallet(
  connection: Connection,
  walletAddress: PublicKey,
  verifiedCreatorAddress: string
) {
  const response = await connection.getParsedTokenAccountsByOwner(
    walletAddress,
    {
      programId: TOKEN_PROGRAM_ADDRESS,
    }
  );

  const mints = await Promise.all(
    response.value
      .filter(
        (accInfo) => accInfo.account.data.parsed.info.tokenAmount.uiAmount !== 0
      )
      .map((accInfo) =>
        getMetadataForMint(connection, accInfo.account.data.parsed.info.mint)
      )
  );

  const filteredMints = mints.filter((mint) => {
    return mint?.data?.data?.creators?.find(
      (creator) =>
        creator.verified && creator.address === verifiedCreatorAddress
    );
  });

  return Promise.all(
    filteredMints.map(async (filteredMint) => {
      const data = await retrieveStorageDataForUrl(filteredMint.data.data.uri);
      return {
        chainData: filteredMint,
        mint: filteredMint.data.mint,
        storageData: data,
        tokenAddress: filteredMint.pubkey.toString(),
      };
    })
  );
}
