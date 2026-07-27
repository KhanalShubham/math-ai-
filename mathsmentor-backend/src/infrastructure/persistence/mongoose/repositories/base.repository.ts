import type { Model, HydratedDocument } from 'mongoose';

/**
 * Generic Mongoose-backed base class. Concrete repositories (e.g.
 * MongoStudentRepository) extend this and implement their module's
 * `*.repository.interface.ts` contract — services depend on that interface,
 * never on this class or on Mongoose directly (ARCHITECTURE.md §21.2).
 *
 * Intentionally minimal: only the handful of operations shared by nearly
 * every repository. Module-specific queries belong in the concrete subclass,
 * not bolted on here as optional parameters.
 */
export abstract class MongooseBaseRepository<TDoc> {
  protected constructor(protected readonly model: Model<TDoc>) {}

  async findById(id: string): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findById(id).exec();
  }

  async create(data: Partial<TDoc>): Promise<HydratedDocument<TDoc>> {
    return this.model.create(data);
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
