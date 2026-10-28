import styles from './DemoBanner.module.css'

const REPOSITORY = 'https://github.com/kazimVakhobov/har-kun-ai'

/**
 * The disclosure for the static build, and the only thing on screen that could
 * not be true of the real app ([ADR 0018](../../docs/adr/0018-static-demo-build.md)).
 *
 * It is not dismissible. A visitor who closes it and then reads lorem ipsum has
 * been misled by the interface, and nothing further down the page says
 * otherwise loudly enough — the line under the composer is a footnote.
 */
export function DemoBanner() {
  return (
    <aside className={styles.root} aria-label="О демо-версии">
      <p className={styles.text}>
        <b className={styles.lead}>Демо.</b> Отвечает заглушка в вашем браузере — модель не
        подключена, ключ не нужен и не используется. Настоящее здесь всё остальное: стриминг,
        «Стоп» с сохранением куска, markdown, обработка отказов —{' '}
        <b className={styles.lead}>выберите «Отказ»</b> в списке моделей.
      </p>

      <p className={styles.text}>
        Живая модель — локально: клонировать репозиторий, вписать свой ключ OpenRouter,{' '}
        <code>npm run dev</code>.{' '}
        <a className={styles.link} href={REPOSITORY} target="_blank" rel="noreferrer noopener">
          Исходники и README
        </a>
      </p>
    </aside>
  )
}
