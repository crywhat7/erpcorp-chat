export type UsuarioRole = "admin" | "user";

export type Usuario = {
  id: string;
  nombre: string;
  username: string;
  password: string;
  tarea_actual: string | null;
  tarea_inicio: string | null;
  avatar_url: string | null;
  role: UsuarioRole;
  created_at?: string;
};

export type Canal = {
  id: string;
  nombre: string;
  slug: string;
  created_at?: string;
};

export type Mensaje = {
  id: string;
  canal_id: string;
  usuario_id: string;
  texto: string;
  creado_at: string;
};

export type Fase = {
  id: string;
  titulo: string;
  orden: number;
  created_at?: string;
};

export type Paso = {
  id: string;
  fase_id: string;
  descripcion: string;
  asignado_id: string | null;
  estado: "pendiente" | "proceso" | "listo";
  orden: number;
  created_at?: string;
};

export type Recurso = {
  id: string;
  nombre_archivo: string;
  url_bucket: string;
  subido_por: string | null;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      usuarios: { Row: Usuario; Insert: Omit<Usuario, "id">; Update: Partial<Usuario> };
      canales: { Row: Canal; Insert: Omit<Canal, "id">; Update: Partial<Canal> };
      mensajes: { Row: Mensaje; Insert: Omit<Mensaje, "id">; Update: Partial<Mensaje> };
      fases: { Row: Fase; Insert: Omit<Fase, "id">; Update: Partial<Fase> };
      pasos: { Row: Paso; Insert: Omit<Paso, "id">; Update: Partial<Paso> };
      recursos: { Row: Recurso; Insert: Omit<Recurso, "id">; Update: Partial<Recurso> };
    };
  };
};
