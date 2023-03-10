export enum DataLocationPermission {
  Default = "DATA_LOCATION_ACCESS",
}

export enum DatabasePermission {
  All = "ALL",
  Alter = "ALTER",
  Drop = "DROP",
  CreateTable = "CREATE_TABLE",
}

export enum TablePermission {
  All = "ALL",
  Select = "SELECT",
  Alter = "ALTER",
  Drop = "DROP",
  Delete = "DELETE",
  Insert = "INSERT",
}

export enum TableWithColumnFilter {
  Include = "Include",
  Exclude = "Exclude",
}
