// apps/web/app/experience/jinze-water-net/surfaces/types.ts
// 冻结切片的最小类型面（Renderer 只消费这些结构；不携带任何历史几何）

export interface SliceShape {
  features: Array<{ feature_key: string; feature_type: string; canonical_label: string }>;
  relations: Array<{
    relation_key: string;
    subject_feature_key: string;
    predicate: string;
    object_feature_key: string;
    epistemic_class: string;
  }>;
  changes: Array<{
    change_key: string;
    canonical_label: string;
    change_status: string;
    change_epistemic: string;
    from_state: string;
    to_state: string;
    time_hint: string;
  }>;
  current_sources: Array<{
    anchor_key: string;
    kind: string;
    coord_system: string;
    location_raw: string;
    source_label: string;
  }>;
  spatial_extent_current: {
    gcj02_bbox: { max_lat: number; max_lng: number; min_lat: number; min_lng: number };
    gcj02_span_m: { ew_m: number; ns_m: number; note: string };
    anchor_count: number;
  };
}
