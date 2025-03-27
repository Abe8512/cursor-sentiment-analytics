
import { supabase } from '@/integrations/supabase/client';
import { errorHandler } from './ErrorHandlingService';

interface DatabaseTable {
  name: string;
  exists: boolean;
  columns: DatabaseColumn[];
}

interface DatabaseColumn {
  name: string;
  type: string;
  exists: boolean;
}

export class DatabaseDiagnosticService {
  private schemaCache: Record<string, any> = {};
  
  constructor() {
    // Initialize service
  }
  
  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      // Use RPC call to check if table exists
      const { data, error } = await supabase
        .rpc('check_table_exists', { table_name: tableName });
      
      if (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        return false;
      }
      
      return data;
    } catch (error) {
      console.error(`Exception checking if table ${tableName} exists:`, error);
      errorHandler.handleError(error, 'DatabaseDiagnosticService.checkTableExists');
      return false;
    }
  }
  
  async getTableMetadata(): Promise<any[]> {
    try {
      // We'll use a raw SQL query through RPC instead of directly querying information_schema
      const { data, error } = await supabase
        .rpc('get_table_metadata');
      
      if (error) {
        console.error('Error getting table metadata:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception getting table metadata:', error);
      errorHandler.handleError(error, 'DatabaseDiagnosticService.getTableMetadata');
      return [];
    }
  }
  
  async getTableColumns(tableName: string): Promise<DatabaseColumn[]> {
    try {
      // Use RPC call to get columns for a table
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: tableName });
      
      if (error) {
        console.error(`Error getting columns for table ${tableName}:`, error);
        return [];
      }
      
      return (data || []).map((column: any) => ({
        name: column.column_name,
        type: column.data_type,
        exists: true
      }));
    } catch (error) {
      console.error(`Exception getting columns for table ${tableName}:`, error);
      errorHandler.handleError(error, 'DatabaseDiagnosticService.getTableColumns');
      return [];
    }
  }
  
  async checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      // Use RPC call to check if column exists
      const { data, error } = await supabase
        .rpc('check_column_exists', { 
          table_name: tableName,
          column_name: columnName
        });
      
      if (error) {
        console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
        return false;
      }
      
      return data;
    } catch (error) {
      console.error(`Exception checking if column ${columnName} exists in table ${tableName}:`, error);
      errorHandler.handleError(error, 'DatabaseDiagnosticService.checkColumnExists');
      return false;
    }
  }
  
  async getDatabaseDiagnostics(): Promise<{
    tables: DatabaseTable[];
    connections: {
      canConnect: boolean;
      status: string;
    };
  }> {
    try {
      // Check connection
      const connectionCheck = await this.checkConnection();
      
      // Get table information
      const tableMetadata = await this.getTableMetadata();
      
      // Build detailed table info
      const tables: DatabaseTable[] = [];
      
      for (const table of tableMetadata) {
        const columns = await this.getTableColumns(table.table_name);
        
        tables.push({
          name: table.table_name,
          exists: true,
          columns
        });
      }
      
      return {
        tables,
        connections: {
          canConnect: connectionCheck.canConnect,
          status: connectionCheck.status
        }
      };
    } catch (error) {
      console.error('Error getting database diagnostics:', error);
      errorHandler.handleError(error, 'DatabaseDiagnosticService.getDatabaseDiagnostics');
      
      return {
        tables: [],
        connections: {
          canConnect: false,
          status: 'Error getting database diagnostics'
        }
      };
    }
  }
  
  async checkConnection(): Promise<{
    canConnect: boolean;
    status: string;
  }> {
    try {
      console.log('Checking Supabase connection...');
      
      // Simple query to test connection
      const { data, error } = await supabase
        .from('call_transcripts')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Supabase connection failed:', error);
        return {
          canConnect: false,
          status: `Connection failed: ${error.message}`
        };
      }
      
      console.log('Supabase connection successful, found data:', data);
      
      return {
        canConnect: true,
        status: 'Connected successfully'
      };
    } catch (error) {
      console.error('Supabase connection error:', error);
      
      return {
        canConnect: false,
        status: error instanceof Error ? error.message : 'Unknown error connecting to database'
      };
    }
  }
}

// Export a singleton instance for easier use
export const databaseDiagnosticService = new DatabaseDiagnosticService();
