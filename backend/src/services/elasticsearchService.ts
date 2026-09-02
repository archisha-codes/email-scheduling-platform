import { esClient, EMAIL_INDEX_NAME, checkElasticsearchConnection } from '../config/elasticsearch';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export interface IndexedEmailDocument {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
}

export class ElasticsearchService {
  /**
   * Indexes or updates a single email document in Elasticsearch.
   */
  public static async indexEmail(document: IndexedEmailDocument): Promise<boolean> {
    try {
      const isConnected = await checkElasticsearchConnection();
      if (!isConnected) return false;

      await esClient.index({
        index: EMAIL_INDEX_NAME,
        id: document.id,
        document: {
          ...document,
          scheduledAt: new Date(document.scheduledAt).toISOString(),
          sentAt: document.sentAt ? new Date(document.sentAt).toISOString() : null,
          createdAt: new Date(document.createdAt).toISOString(),
        },
        refresh: 'wait_for',
      });

      logger.debug(`Elasticsearch document indexed: ID=${document.id}`);
      return true;
    } catch (error) {
      logger.warn(`Elasticsearch index failure for email ${document.id} (non-blocking):`, error);
      return false;
    }
  }

  /**
   * Bulk indexes multiple emails into Elasticsearch.
   */
  public static async bulkIndexEmails(documents: IndexedEmailDocument[]): Promise<boolean> {
    if (documents.length === 0) return true;

    try {
      const isConnected = await checkElasticsearchConnection();
      if (!isConnected) return false;

      const operations = documents.flatMap((doc) => [
        { index: { _index: EMAIL_INDEX_NAME, _id: doc.id } },
        {
          ...doc,
          scheduledAt: new Date(doc.scheduledAt).toISOString(),
          sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
          createdAt: new Date(doc.createdAt).toISOString(),
        },
      ]);

      const bulkResponse = await esClient.bulk({ refresh: true, operations });
      if (bulkResponse.errors) {
        logger.warn('Elasticsearch bulk indexing reported partial errors');
      } else {
        logger.info(`Elasticsearch bulk indexed ${documents.length} email records`);
      }
      return true;
    } catch (error) {
      logger.warn('Elasticsearch bulk indexing failed:', error);
      return false;
    }
  }

  /**
   * Searches emails using Elasticsearch multi_match query, with automatic fallback to PostgreSQL ILIKE.
   */
  public static async searchEmails(
    userId: string,
    query: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: any[]; total: number; source: 'elasticsearch' | 'postgresql' }> {
    const from = (page - 1) * limit;

    try {
      const isConnected = await checkElasticsearchConnection();
      if (isConnected && query && query.trim() !== '') {
        const mustQueries: any[] = [
          { term: { userId } },
          {
            multi_match: {
              query,
              fields: ['recipient^3', 'recipient.text^3', 'subject^2', 'body', 'senderEmail'],
              fuzziness: 'AUTO',
            },
          },
        ];

        if (status) {
          mustQueries.push({ term: { status } });
        }

        const searchResult = await esClient.search({
          index: EMAIL_INDEX_NAME,
          from,
          size: limit,
          query: {
            bool: {
              must: mustQueries,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
        });

        const totalHits =
          typeof searchResult.hits.total === 'number'
            ? searchResult.hits.total
            : searchResult.hits.total?.value || 0;

        const items = searchResult.hits.hits.map((hit: any) => hit._source);

        return {
          items,
          total: totalHits,
          source: 'elasticsearch',
        };
      }
    } catch (error) {
      logger.warn('Elasticsearch search execution failed, falling back to PostgreSQL:', error);
    }

    // FALLBACK: Query PostgreSQL using ILIKE
    logger.info('Executing database fallback search (PostgreSQL ILIKE)...');
    const whereCondition: any = {
      userId,
    };

    if (status) {
      whereCondition.status = status;
    }

    if (query && query.trim() !== '') {
      whereCondition.OR = [
        { recipient: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [dbItems, total] = await Promise.all([
      prisma.email.findMany({
        where: whereCondition,
        include: {
          sender: {
            select: { email: true, displayName: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: from,
        take: limit,
      }),
      prisma.email.count({ where: whereCondition }),
    ]);

    const formattedItems = dbItems.map((item) => ({
      id: item.id,
      userId: item.userId,
      senderId: item.senderId,
      senderEmail: item.sender.email,
      recipient: item.recipient,
      subject: item.subject,
      body: item.body,
      status: item.status,
      scheduledAt: item.scheduledAt.toISOString(),
      sentAt: item.sentAt ? item.sentAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      items: formattedItems,
      total,
      source: 'postgresql',
    };
  }
}
