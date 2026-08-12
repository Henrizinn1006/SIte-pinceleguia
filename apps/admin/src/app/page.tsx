import { redirect } from "next/navigation";

/**
 * A raiz do painel redireciona para o dashboard.
 *
 * O dashboard vive em /inicio dentro do grupo (painel) porque é lá que
 * ele recebe a navegação lateral e a barra inferior — e /entrar, que
 * fica fora do grupo, não deve receber nenhuma das duas.
 */
export default function Raiz() {
  redirect("/inicio");
}
