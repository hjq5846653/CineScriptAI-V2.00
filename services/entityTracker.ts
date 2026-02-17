import { Scene, TrackedEntity, EntityReference } from '../types';
import { APILogger } from './providerFactory';

class EntityTracker {
  private entities: Map<string, TrackedEntity> = new Map();

  reset(): void {
    this.entities.clear();
    APILogger.log('debug', '实体追踪器已重置');
  }

  extractEntitiesFromScene(scene: Scene): { characters: string[]; props: string[]; locations: string[] } {
    const characters: string[] = [];
    const props: string[] = [];
    const locations: string[] = [];

    if (scene.characters) {
      const charList = scene.characters.split(',').map(c => c.trim()).filter(Boolean);
      characters.push(...charList);
    }

    if (scene.props) {
      const propList = scene.props.split(',').map(p => p.trim()).filter(Boolean);
      props.push(...propList);
    }

    if (scene.location) {
      locations.push(scene.location);
    }

    return { characters, props, locations };
  }

  generateEntityId(name: string, type: 'character' | 'prop' | 'location'): string {
    return `${type}_${name.replace(/\s+/g, '_')}`;
  }

  generateVisualDescriptor(
    name: string,
    type: 'character' | 'prop' | 'location',
    scene: Scene
  ): string {
    const descriptors: string[] = [];
    
    if (type === 'character') {
      descriptors.push(`角色名称: ${name}`);
      if (scene.imagePrompt) {
        const charMatch = scene.imagePrompt.match(new RegExp(`${name}[^。]*`, 'i'));
        if (charMatch) {
          descriptors.push(`外观描述: ${charMatch[0]}`);
        }
      }
      descriptors.push(`场景位置: ${scene.location}`);
      descriptors.push(`场景编号: ${scene.sceneNumber}`);
    } else if (type === 'prop') {
      descriptors.push(`道具名称: ${name}`);
      descriptors.push(`首次出现: ${scene.location}`);
    } else {
      descriptors.push(`场景名称: ${name}`);
      if (scene.lighting) {
        descriptors.push(`光照: ${scene.lighting}`);
      }
    }

    return descriptors.join('; ');
  }

  trackEntity(
    name: string,
    type: 'character' | 'prop' | 'location',
    scene: Scene
  ): TrackedEntity {
    const id = this.generateEntityId(name, type);
    
    const existing = this.entities.get(id);
    if (existing) {
      APILogger.log('debug', `实体已存在: ${name}`, { id, type });
      return existing;
    }

    const visualDescription = this.generateVisualDescriptor(name, type, scene);
    
    const entity: TrackedEntity = {
      id,
      name,
      type,
      visualDescription,
      firstAppearanceScene: scene.sceneNumber,
      locked: false,
    };

    this.entities.set(id, entity);
    APILogger.log('info', `追踪新实体: ${name}`, { id, type, scene: scene.sceneNumber });
    
    return entity;
  }

  getEntity(name: string, type: 'character' | 'prop' | 'location'): TrackedEntity | undefined {
    const id = this.generateEntityId(name, type);
    return this.entities.get(id);
  }

  getAllEntities(): TrackedEntity[] {
    return Array.from(this.entities.values());
  }

  updateEntityDescription(id: string, description: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    
    if (entity.locked) {
      APILogger.log('warn', `实体已锁定，无法更新: ${entity.name}`);
      return false;
    }

    entity.visualDescription = description;
    APILogger.log('info', `更新实体描述: ${entity.name}`);
    return true;
  }

  lockEntity(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    
    entity.locked = true;
    APILogger.log('info', `锁定实体: ${entity.name}`);
    return true;
  }

  unlockEntity(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    
    entity.locked = false;
    APILogger.log('info', `解锁实体: ${entity.name}`);
    return true;
  }

  processScene(scene: Scene): EntityReference[] {
    const { characters, props, locations } = this.extractEntitiesFromScene(scene);
    const references: EntityReference[] = [];

    for (const char of characters) {
      const entity = this.trackEntity(char, 'character', scene);
      references.push({
        entityId: entity.id,
        entityName: entity.name,
        entityType: 'character',
      });
    }

    for (const prop of props) {
      const entity = this.trackEntity(prop, 'prop', scene);
      references.push({
        entityId: entity.id,
        entityName: entity.name,
        entityType: 'prop',
      });
    }

    for (const loc of locations) {
      const entity = this.trackEntity(loc, 'location', scene);
      references.push({
        entityId: entity.id,
        entityName: entity.name,
        entityType: 'location',
      });
    }

    APILogger.log('debug', `场景 ${scene.sceneNumber} 实体引用`, { 
      characterCount: characters.length,
      propCount: props.length,
      locationCount: locations.length,
    });

    return references;
  }

  getEntityDescriptorsForPrompt(entityNames: string[], type: 'character' | 'prop' | 'location'): string {
    const descriptors: string[] = [];

    for (const name of entityNames) {
      const entity = this.getEntity(name, type);
      if (entity) {
        descriptors.push(`【${name}】${entity.visualDescription}`);
      }
    }

    return descriptors.join('\n');
  }

  exportEntities(): TrackedEntity[] {
    return this.getAllEntities();
  }

  importEntities(entities: TrackedEntity[]): void {
    this.entities.clear();
    for (const entity of entities) {
      this.entities.set(entity.id, entity);
    }
    APILogger.log('info', `导入 ${entities.length} 个实体`);
  }
}

export const entityTracker = new EntityTracker();
export default entityTracker;
