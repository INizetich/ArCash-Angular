export default interface FavoriteContact {
  id: number;
  contactAlias: string;
  description?: string;
  creationDate: string;
  lastUsed?: string;
  active: boolean;
  accountOwnerName: string;      // Nombre del dueño de la cuenta favorita
  accountOwnerAlias: string;     // Alias del dueño de la cuenta favorita
  accountCbu: String;            // CBU de la cuenta favorita
  accountAlias: string;          // Alias de la cuenta favorita
  accountType: string;
}

export interface AddFavoriteContactRequest {
  accountId: number;
  contactAlias: string;
  description?: string;
}

export interface UpdateFavoriteContactRequest {
  contactAlias?: string;
  description?: string;
}
